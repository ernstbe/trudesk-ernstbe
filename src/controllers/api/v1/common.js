/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Author:     Chris Brame
 *  Updated:    3/12/19 11:32 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const async = require('async')
const winston = require('../../../logger')

const commonV1 = {}

/**
 * Preforms login with username/password and adds
 * an access token to the {@link User} object.
 *
 * @param {object} req Express Request
 * @param {object} res Express Response
 * @return {JSON} {@link User} object
 * @see {@link User}
 * @example
 * //Accepts Content-Type:application/json
 * {
 *    username: req.body.username,
 *    password: req.body.password
 * }
 *
 * @example
 * //Object Returned has the following properties removed
 * var resUser = { ...user._doc };
 * delete resUser.resetPassExpire;
 * delete resUser.resetPassHash;
 * delete resUser.password;
 * delete resUser.iOSDeviceToken;
 *
 */
commonV1.login = async function (req, res) {
  const userModel = require('../../../models/user')
  const username = req.body.username
  const password = req.body.password
  // Optional: PWA / mobile clients generate a stable UUID per install
  // and send it here so each device gets its own slot in `accessTokens`
  // instead of stomping on the others. Legacy clients without deviceId
  // still work — they just get a no-deviceId entry that the next login
  // appends to rather than replaces.
  const deviceId = req.body.deviceId
  const userAgent = req.headers['user-agent']

  if (username === undefined || password === undefined) {
    return res.sendStatus(403)
  }

  try {
    const user = await userModel.getUserByUsername(username)
    if (!user) return res.status(401).json({ success: false, error: 'Invalid User' })

    if (!userModel.validate(password, user.password)) { return res.status(401).json({ success: false, error: 'Invalid Password' }) }

    // Mint a fresh per-device token. This rotates the device's previous
    // token (if any) — old token immediately invalid — while leaving
    // other devices' sessions intact. Pre-multi-device behavior was to
    // return whatever single token already lived on the account, which
    // is what made leaked localStorage tokens permanent.
    const newToken = await user.addAccessToken(deviceId, userAgent)

    const resUser = { ...user._doc }
    delete resUser.resetPassExpire
    delete resUser.resetPassHash
    delete resUser.password
    delete resUser.iOSDeviceTokens
    delete resUser.tOTPKey
    delete resUser.__v
    delete resUser.preferences
    delete resUser.accessToken
    delete resUser.accessTokens

    req.user = resUser
    res.header('X-Subject-Token', newToken)
    return res.json({
      success: true,
      accessToken: newToken,
      user: resUser
    })
  } catch (err) {
    return res.status(401).json({ success: false, error: err.message })
  }
}

commonV1.getLoggedInUser = function (req, res) {
  if (!req.user) {
    return res.status(400).json({ success: false, error: 'Invalid Auth' })
  }

  const resUser = { ...req.user._doc }
  delete resUser.resetPassExpire
  delete resUser.accessToken
  delete resUser.resetPassHash
  delete resUser.password
  delete resUser.iOSDeviceTokens
  delete resUser.tOTPKey
  delete resUser.__v

  return res.json({ success: true, user: resUser })
}

/**
 * Preforms logout
 * {@link User} object.
 *
 * @param {object} req Express Request
 * @param {object} res Express Response
 * @return {JSON} Success/Error object
 *
 * @example
 * //Tokens are sent in the HTTP Header
 * var token = req.headers.token;
 * var deviceToken = req.headers.devicetoken;
 */
commonV1.logout = async function (req, res) {
  const deviceToken = req.headers.devicetoken
  const user = req.user

  // Gracefully handle the device-token cleanup. The previous implementation
  // called `user.removeDeviceToken(...)` but the User schema doesn't define
  // that method (and there are no device-token fields), so any mobile client
  // that sent a `devicetoken` header got a 400 instead of a clean logout.
  // Until push-notification support is actually implemented we just no-op.
  if (deviceToken && typeof user?.removeDeviceToken === 'function') {
    try {
      user.removeDeviceToken(deviceToken, 1, function () { /* fire-and-forget */ })
    } catch (e) {
      // Fall through — the session destruction by Passport happens elsewhere.
    }
  }

  // Remove ONLY this device's token. The previous implementation rotated
  // the single legacy token, which invalidated every device the user was
  // signed in on. Now each device owns its own entry in `accessTokens`,
  // so logging out on the phone leaves the desktop session intact.
  //
  // The token to remove is the one the request authenticated with —
  // pulled straight from the auth header rather than from the user
  // document (which is loaded without `accessTokens` for select-false
  // reasons unless the model getter loads it).
  const currentToken = req.headers.accesstoken
  try {
    if (user && typeof user.removeAccessToken === 'function' && currentToken) {
      await user.removeAccessToken(currentToken)
    }
  } catch (e) {
    // Don't fail the logout response over a token-removal error;
    // the worst case is the old token stays valid.
  }

  return res.status(200).json({ success: true })
}

commonV1.privacyPolicy = async (req, res) => {
  const SettingsUtil = require('../../../settings/settingsUtil')
  try {
    const results = await SettingsUtil.getSettings()

    return res.json({ success: true, privacyPolicy: results.data.settings.privacyPolicy.value })
  } catch (err) {
    winston.warn(err)
    return res.status(500).json({ success: false, error: err })
  }
}

module.exports = commonV1
