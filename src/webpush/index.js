/*
 * Web Push (VAPID) — sends browser push notifications to subscriptions
 * stored on the user's `pushSubscriptions` array.
 *
 * Lifecycle:
 *   - `init()` runs at boot. Loads or auto-generates the VAPID keypair
 *     and persists it in the settings collection. Both keys are needed:
 *     public is handed out to clients; private signs the JWT the push
 *     service requires.
 *   - `getPublicKey()` is the read-side companion — controllers use it
 *     to hand the public key to subscribing clients.
 *   - `sendToUser(userId, payload)` enumerates the user's subscriptions,
 *     posts the encrypted payload to each, and tombstones any
 *     subscription the push service rejects with 404/410.
 */

const webpush = require('web-push')
const winston = require('winston')

const settingSchema = require('../models/setting')
const settingUtil = require('../settings/settingsUtil')
const userSchema = require('../models/user')

const PUBLIC_KEY_SETTING = 'webpush:vapid:publicKey'
const PRIVATE_KEY_SETTING = 'webpush:vapid:privateKey'
const SUBJECT_SETTING = 'webpush:vapid:subject'
const DEFAULT_SUBJECT = 'mailto:admin@trudesk.local'

let publicKey = null
let privateKey = null
let subject = DEFAULT_SUBJECT
let initialized = false

async function init () {
  const [pubSetting, privSetting, subjSetting] = await Promise.all([
    settingSchema.getSettingByName(PUBLIC_KEY_SETTING),
    settingSchema.getSettingByName(PRIVATE_KEY_SETTING),
    settingSchema.getSettingByName(SUBJECT_SETTING)
  ])

  if (pubSetting && privSetting && pubSetting.value && privSetting.value) {
    publicKey = pubSetting.value
    privateKey = privSetting.value
  } else {
    const keys = webpush.generateVAPIDKeys()
    publicKey = keys.publicKey
    privateKey = keys.privateKey
    await settingUtil.setSetting(PUBLIC_KEY_SETTING, publicKey)
    await settingUtil.setSetting(PRIVATE_KEY_SETTING, privateKey)
    winston.info('webpush: generated new VAPID keypair')
  }

  subject = (subjSetting && subjSetting.value) || DEFAULT_SUBJECT
  webpush.setVapidDetails(subject, publicKey, privateKey)
  initialized = true
}

function getPublicKey () {
  return publicKey
}

function isInitialized () {
  return initialized
}

/**
 * Send `payload` to every push subscription the user has registered.
 * Subscriptions rejected with 404/410 are removed from the array
 * (the browser has unsubscribed or the install has been wiped).
 *
 * @param {string|object} userId  User _id (or a populated user doc).
 * @param {object} payload        { title, body, url?, icon?, tag? } — JSON-encoded for the SW.
 * @returns {Promise<{ sent: number, removed: number }>}
 */
async function sendToUser (userId, payload) {
  if (!initialized) return { sent: 0, removed: 0 }
  if (!userId) return { sent: 0, removed: 0 }

  const user = await userSchema.findById(userId).select('+pushSubscriptions').exec()
  if (!user || !Array.isArray(user.pushSubscriptions) || user.pushSubscriptions.length === 0) {
    return { sent: 0, removed: 0 }
  }

  const body = JSON.stringify(payload || {})
  const toRemove = []
  let sent = 0

  await Promise.all(
    user.pushSubscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
          body
        )
        sent += 1
      } catch (err) {
        const status = err && err.statusCode
        if (status === 404 || status === 410) {
          toRemove.push(sub.endpoint)
        } else {
          winston.warn('webpush: send failed (' + (status || 'no-status') + ') — ' + (err && err.message))
        }
      }
    })
  )

  let removed = 0
  if (toRemove.length > 0) {
    const before = user.pushSubscriptions.length
    user.pushSubscriptions = user.pushSubscriptions.filter((s) => !toRemove.includes(s.endpoint))
    removed = before - user.pushSubscriptions.length
    try { await user.save() } catch (err) { /* best-effort */ }
  }

  return { sent, removed }
}

module.exports = {
  init,
  getPublicKey,
  isInitialized,
  sendToUser,
  // Setting names exposed so tests can clear them.
  PUBLIC_KEY_SETTING,
  PRIVATE_KEY_SETTING,
  SUBJECT_SETTING
}
