/*
 * Push subscription controller — the PWA's bridge from the browser's
 * PushManager.subscribe() result into the user's `pushSubscriptions`
 * array. Companion to `src/webpush/index.js`, which handles the actual
 * send + VAPID lifecycle.
 *
 * All endpoints operate strictly on `req.user` — there's no admin
 * surface here. A user can only manage their own subscriptions.
 */

const userSchema = require('../../../models/user')
const webpush = require('../../../webpush')

const pushSubs = {}

/**
 * GET /api/v1/account/push/vapid-public
 *
 * Returns the VAPID public key the browser needs to pass into
 * `PushManager.subscribe({ applicationServerKey })`. Plain string in
 * `publicKey` — the client base64url-decodes it before subscribing.
 */
pushSubs.vapidPublic = async function (req, res) {
  if (!webpush.isInitialized()) {
    return res.status(503).json({ success: false, error: 'Push notifications not configured' })
  }
  return res.json({ success: true, publicKey: webpush.getPublicKey() })
}

/**
 * POST /api/v1/account/push/subscribe
 *
 * Body: { endpoint, keys: { p256dh, auth }, deviceId?, userAgent? }
 *
 * Adds the subscription to the authenticated user. Idempotent on
 * `endpoint` — if the same endpoint is already stored, the keys + UA
 * are refreshed instead of duplicated (the browser may rotate keys on
 * its own).
 */
pushSubs.subscribe = async function (req, res) {
  const body = req.body || {}
  if (!body.endpoint || !body.keys || !body.keys.p256dh || !body.keys.auth) {
    return res.status(400).json({ success: false, error: 'Invalid subscription payload' })
  }

  try {
    const user = await userSchema.findById(req.user._id).select('+pushSubscriptions').exec()
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })

    if (!Array.isArray(user.pushSubscriptions)) user.pushSubscriptions = []
    const existing = user.pushSubscriptions.find((s) => s.endpoint === body.endpoint)
    if (existing) {
      existing.keys = { p256dh: body.keys.p256dh, auth: body.keys.auth }
      if (body.userAgent) existing.userAgent = body.userAgent
      if (body.deviceId) existing.deviceId = body.deviceId
    } else {
      user.pushSubscriptions.push({
        endpoint: body.endpoint,
        keys: { p256dh: body.keys.p256dh, auth: body.keys.auth },
        deviceId: body.deviceId,
        userAgent: body.userAgent,
        createdAt: new Date()
      })
    }

    await user.save()
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

/**
 * DELETE /api/v1/account/push/subscribe
 *
 * Body: { endpoint }
 *
 * Removes a single subscription by endpoint. Used when the PWA
 * explicitly unsubscribes (Settings toggle off) so we don't keep
 * pushing to a browser that won't show the notification.
 */
pushSubs.unsubscribe = async function (req, res) {
  const endpoint = (req.body && req.body.endpoint) || null
  if (!endpoint) return res.status(400).json({ success: false, error: 'Missing endpoint' })

  try {
    const user = await userSchema.findById(req.user._id).select('+pushSubscriptions').exec()
    if (!user) return res.status(404).json({ success: false, error: 'User not found' })

    if (!Array.isArray(user.pushSubscriptions)) user.pushSubscriptions = []
    const before = user.pushSubscriptions.length
    user.pushSubscriptions = user.pushSubscriptions.filter((s) => s.endpoint !== endpoint)
    if (user.pushSubscriptions.length === before) {
      return res.status(404).json({ success: false, error: 'No such subscription' })
    }

    await user.save()
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = pushSubs
