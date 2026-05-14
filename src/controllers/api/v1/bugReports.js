/*
 * Bug-report controller — backs the PWA's "Report a bug" FAB.
 *
 * `submit` stores a report from any authenticated user and then drops
 * a Notification onto every admin-role account so the existing
 * webpush pipeline pushes the alert. The admin can read full reports
 * via `list`, mark them resolved via `setResolved`, or delete with
 * `remove` once they've been acted on.
 */

const winston = require('winston')

const bugReportSchema = require('../../../models/bugReport')
const userSchema = require('../../../models/user')
const roleSchema = require('../../../models/role')
const NotificationSchema = require('../../../models/notification')

const bugReports = {}

function isAdminUser (user) {
  // The auto-populate on User only pulls `name/description/normalized/_id`
  // for the role to keep regular queries small, so `user.role.grants`
  // is undefined. Look up the full role from the boot-time cache by
  // normalized name and read `grants` from there — same pattern PR #55
  // uses to dodge the stale-virtual problem.
  if (!user || !user.role || !global.roles) return false
  const full = global.roles.find(r => r.normalized === user.role.normalized)
  if (!full) return false
  const grants = full.grants
  return Array.isArray(grants) && grants.indexOf('admin:*') !== -1
}

/**
 * POST /api/v1/bug-reports
 *
 * Body: { title, description?, context? }
 *
 * Any authenticated user may submit. Creates the report, then drops a
 * Notification for each admin so push subscriptions fire.
 */
bugReports.submit = async function (req, res) {
  const body = req.body || {}
  const title = (body.title || '').trim()
  if (!title) return res.status(400).json({ success: false, error: 'Title required' })

  try {
    const report = await bugReportSchema.createReport(req.user._id, title, body.description, body.context)

    // Fan out notifications to admins. Lazy-loaded role list — if the
    // global cache isn't populated yet (early boot) we fall back to
    // fetching directly. Either way we read grants from each role.
    const allRoles = global.roles || (await roleSchema.getRoles())
    const adminRoleIds = allRoles
      .filter(r => Array.isArray(r.grants) && r.grants.indexOf('admin:*') !== -1)
      .map(r => r._id)

    if (adminRoleIds.length > 0) {
      const admins = await userSchema.find({ role: { $in: adminRoleIds }, deleted: { $ne: true } }, '_id')
      const reporter = await userSchema.findById(req.user._id, 'fullname username')
      const reporterLabel = reporter ? (reporter.fullname || reporter.username) : 'Unbekannt'

      await Promise.all(admins.map(async (admin) => {
        // Don't notify the reporter themselves if they're also an admin.
        if (String(admin._id) === String(req.user._id)) return
        const notif = new NotificationSchema({
          owner: admin._id,
          title: 'Neuer Bug-Report: ' + title.slice(0, 80),
          message: 'Von ' + reporterLabel,
          type: 1,
          data: { bugReportId: report._id }
        })
        try { await notif.save() } catch (err) { winston.warn('bugReports: notify admin failed — ' + err.message) }
      }))
    }

    return res.json({ success: true, id: report._id })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

/**
 * GET /api/v1/bug-reports
 *
 * Admin-only list. Returns the most recent 500 reports, newest first,
 * with reporter populated.
 */
bugReports.list = async function (req, res) {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ success: false, error: 'Admin required' })
  }
  try {
    const reports = await bugReportSchema.listAll()
    return res.json({ success: true, reports })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

/**
 * PATCH /api/v1/bug-reports/:id
 *
 * Body: { resolved: boolean }
 *
 * Admin-only. Flips the resolved flag (and stamps `resolvedAt` on transition).
 */
bugReports.setResolved = async function (req, res) {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ success: false, error: 'Admin required' })
  }
  const id = req.params.id
  const resolved = !!(req.body && req.body.resolved)
  try {
    const updated = await bugReportSchema.markResolved(id, resolved)
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' })
    return res.json({ success: true, report: updated })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

/**
 * DELETE /api/v1/bug-reports/:id
 *
 * Admin-only. Permanently removes the report.
 */
bugReports.remove = async function (req, res) {
  if (!isAdminUser(req.user)) {
    return res.status(403).json({ success: false, error: 'Admin required' })
  }
  try {
    const result = await bugReportSchema.findByIdAndDelete(req.params.id)
    if (!result) return res.status(404).json({ success: false, error: 'Not found' })
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = bugReports
