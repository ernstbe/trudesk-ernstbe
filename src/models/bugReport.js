/*
 * Bug reports filed from the PWA's "Report a bug" FAB. Stored as their
 * own collection rather than shoehorned into tickets because they carry
 * structured client-side context (UA, URL, console tail, build SHA) and
 * shouldn't pollute the regular ticket queue.
 *
 * On insert, the controller fans out a Notification to every admin-role
 * user so the existing webpush pipeline pushes the alert to their
 * registered devices.
 */

const mongoose = require('mongoose')

const COLLECTION = 'bugreports'

const bugReportSchema = mongoose.Schema({
  reportedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts', required: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: '', maxlength: 5000 },
  // Structured client-side context. Kept as a free-form object since
  // the PWA may evolve what it collects (current page, build SHA, last
  // N console messages, viewport size, etc.) without a schema migration.
  context: { type: Object, default: {} },
  createdAt: { type: Date, default: Date.now },
  resolved: { type: Boolean, default: false },
  resolvedAt: { type: Date }
})

bugReportSchema.statics.createReport = async function (reportedBy, title, description, context) {
  return this.model(COLLECTION).create({
    reportedBy,
    title: String(title || '').slice(0, 200),
    description: String(description || '').slice(0, 5000),
    context: context && typeof context === 'object' ? context : {}
  })
}

bugReportSchema.statics.listAll = async function () {
  return this.model(COLLECTION)
    .find({})
    .sort({ createdAt: -1 })
    .populate('reportedBy', 'username fullname email')
    .limit(500)
    .exec()
}

bugReportSchema.statics.markResolved = async function (id, resolved) {
  return this.model(COLLECTION).findByIdAndUpdate(
    id,
    { resolved: !!resolved, resolvedAt: resolved ? new Date() : null },
    { new: true }
  )
}

module.exports = mongoose.model(COLLECTION, bugReportSchema)
