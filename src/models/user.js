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
 *  Updated:    1/20/19 4:43 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const mongoose = require('mongoose')
const winston = require('winston')
const bcrypt = require('bcrypt')
const Chance = require('chance')
const utils = require('../helpers/utils')

// Required for linkage
require('./role')

const SALT_FACTOR = 10
const COLLECTION = 'accounts'

// Sliding-expiry window for per-device access tokens. A token whose
// `lastUsedAt` falls outside this window is treated as expired:
// `getUserByAccessToken` rejects it lazily on the next request, and the
// weekly cron in `taskRunner` purges the dead entries from the array.
const ACCESS_TOKEN_IDLE_TTL_MS = 90 * 24 * 60 * 60 * 1000

/**
 * User Schema
 * @module models/user
 * @class User
 *
 * @property {object} _id ```Required``` ```unique``` MongoDB Object ID
 * @property {String} username ```Required``` ```unique``` Username of user
 * @property {String} password ```Required``` Bcrypt password
 * @property {String} fullname ```Required``` Full name of user
 * @property {String} email ```Required``` ```unique``` Email Address of user
 * @property {String} role ```Required``` Permission role of the given user. See {@link Permissions}
 * @property {Date} lastOnline Last timestamp given user was online.
 * @property {String} title Job Title of user
 * @property {String} image Filename of user image
 * @property {String} resetPassHash Password reset has for recovery password link.
 * @property {Date} resetPassExpire Date when the password recovery link will expire
 * @property {String} tOTPKey One Time Password Secret Key
 * @property {Number} tOTPPeriod One Time Password Key Length (Time) - Default 30 Seconds
 * @property {String} accessToken API Access Token
 * @property {Object} preferences Object to hold user preferences
 * @property {Boolean} preferences.autoRefreshTicketGrid Enable the auto refresh of the ticket grid.
 * @property {Boolean} deleted Account Deleted
 */
const userSchema = mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, select: false },
  fullname: { type: String, required: true, index: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  role: { type: mongoose.Schema.Types.ObjectId, ref: 'roles', required: true },
  lastOnline: Date,
  title: String,
  image: String,

  workNumber: { type: String },
  mobileNumber: { type: String },
  companyName: { type: String },
  facebookUrl: { type: String },
  linkedinUrl: { type: String },
  twitterUrl: { type: String },

  resetPassHash: { type: String, select: false },
  resetPassExpire: { type: Date, select: false },
  tOTPKey: { type: String, select: false },
  tOTPPeriod: { type: Number, select: false },
  resetL2AuthHash: { type: String, select: false },
  resetL2AuthExpire: { type: Date, select: false },
  hasL2Auth: { type: Boolean, required: true, default: false },
  // Legacy single-token field. New code reads/writes the `accessTokens`
  // array below; this field is kept as a fallback for accounts that
  // haven't logged in since the multi-device migration. `addAccessToken`
  // clears it once a per-device entry exists, and `getUserByAccessToken`
  // accepts either source. Eventually (Phase 4) we drop this field.
  accessToken: { type: String, sparse: true, select: false },
  // Multi-device session tokens. One entry per logged-in device, keyed
  // by a client-supplied `deviceId` (the PWA generates and persists a
  // UUID per install). Logging in on the same device replaces that
  // entry's `token` so an old token gets invalidated; logging in on a
  // new device adds a new entry without touching existing sessions.
  // `lastUsedAt` is updated opportunistically by the auth middleware so
  // a future Settings UI can show "Browser X, last seen 2h ago" and
  // expire idle entries.
  accessTokens: {
    type: [
      new mongoose.Schema(
        {
          token: { type: String, required: true },
          deviceId: { type: String },
          userAgent: { type: String },
          createdAt: { type: Date, default: Date.now },
          lastUsedAt: { type: Date, default: Date.now }
        },
        { _id: false }
      )
    ],
    select: false,
    default: []
  },

  preferences: {
    tourCompleted: { type: Boolean, default: false },
    autoRefreshTicketGrid: { type: Boolean, default: true },
    openChatWindows: [{ type: String, default: [] }],
    keyboardShortcuts: { type: Boolean, default: true },
    timezone: { type: String }
  },

  deleted: { type: Boolean, default: false }
})

userSchema.set('toObject', { getters: true })

const autoPopulateRole = function () {
  this.populate('role', 'name description normalized _id')
}

userSchema.pre('findOne', autoPopulateRole).pre('find', autoPopulateRole)

userSchema.pre('save', async function () {
  const user = this

  user.username = utils.applyMaxShortTextLength(utils.sanitizeFieldPlainText(user.username.toLowerCase().trim()))
  user.email = utils.sanitizeFieldPlainText(user.email.trim())

  if (user.fullname) user.fullname = utils.applyMaxShortTextLength(utils.sanitizeFieldPlainText(user.fullname.trim()))
  if (user.title) user.title = utils.applyMaxShortTextLength(utils.sanitizeFieldPlainText(user.title.trim()))

  if (!user.isModified('password')) {
    return
  }

  if (user.password.toString().length > 255) user.password = utils.applyMaxTextLength(user.password)

  const salt = await bcrypt.genSalt(SALT_FACTOR)
  const hash = await bcrypt.hash(user.password, salt)
  user.password = hash
})

/**
 * Mint or rotate a per-device access token.
 *
 * Behavior:
 *   - With `deviceId`: if an entry for that device already exists, its
 *     `token` is replaced (old token becomes invalid). Otherwise a new
 *     entry is pushed. This is the multi-device-safe path used by login.
 *   - Without `deviceId`: a fresh entry is appended with no device key.
 *     Used by signup (no device yet) and the admin "Generate API Key"
 *     button.
 *
 * Either way, the legacy single `accessToken` field is cleared so we
 * don't end up with a token outside the array that we'd have to scan
 * for on every auth.
 *
 * @param {string} [deviceId] Stable per-install identifier from the client.
 * @param {string} [userAgent] Free-form UA string for the future sessions UI.
 * @returns {Promise<string>} The newly minted token.
 */
userSchema.methods.addAccessToken = async function (deviceId, userAgent) {
  const user = this
  const date = new Date()
  const salt = user.username.toString() + date.toISOString() + (deviceId || '')
  const chance = new Chance(salt)
  const newToken = chance.hash()

  if (!Array.isArray(user.accessTokens)) user.accessTokens = []

  if (deviceId) {
    const existing = user.accessTokens.find((t) => t.deviceId === deviceId)
    if (existing) {
      existing.token = newToken
      existing.lastUsedAt = date
      if (userAgent) existing.userAgent = userAgent
    } else {
      user.accessTokens.push({ token: newToken, deviceId, userAgent, createdAt: date, lastUsedAt: date })
    }
  } else {
    user.accessTokens.push({ token: newToken, userAgent, createdAt: date, lastUsedAt: date })
  }

  // NOTE: we intentionally do NOT clear `user.accessToken` here. Old
  // PWA installs that booted before this deploy still have the legacy
  // token in localStorage; clearing the field would lock them out on
  // their next request. The legacy token stays valid alongside the new
  // per-device entries until the user explicitly logs out (which only
  // removes the token they authenticated with) or until a future
  // explicit migration step.
  await user.save()
  return newToken
}

/**
 * Remove access token(s).
 *
 * @param {string} [token] If given, only the matching entry is removed
 *   (logout-this-device semantics). If omitted, ALL tokens for the user
 *   are removed plus the legacy field is cleared (admin "remove API
 *   key" and force-logout-all semantics).
 */
userSchema.methods.removeAccessToken = async function (token) {
  const user = this
  let dirty = false

  if (token) {
    if (Array.isArray(user.accessTokens) && user.accessTokens.length > 0) {
      const before = user.accessTokens.length
      user.accessTokens = user.accessTokens.filter((t) => t.token !== token)
      if (user.accessTokens.length !== before) dirty = true
    }
    if (user.accessToken && user.accessToken === token) {
      user.accessToken = undefined
      dirty = true
    }
  } else {
    if (Array.isArray(user.accessTokens) && user.accessTokens.length > 0) {
      user.accessTokens = []
      dirty = true
    }
    if (user.accessToken) {
      user.accessToken = undefined
      dirty = true
    }
  }

  if (dirty) await user.save()
}

userSchema.methods.generateL2Auth = async function () {
  const user = this
  if (user.tOTPKey === undefined || user.tOTPKey === null) {
    const chance = new Chance()
    const base32 = require('thirty-two')

    const genOTPKey = chance.string({
      length: 7,
      pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ23456789'
    })

    const base32GenOTPKey = base32
      .encode(genOTPKey)
      .toString()
      .replace(/=/g, '')

    return base32GenOTPKey
  } else {
    throw new Error('FATAL: Key already assigned!')
  }
}

userSchema.methods.removeL2Auth = async function () {
  const user = this

  user.tOTPKey = undefined
  user.hasL2Auth = false
  await user.save()
}

userSchema.methods.addOpenChatWindow = async function (convoId) {
  if (convoId === undefined) {
    throw new Error('Invalid convoId')
  }
  const user = this
  const hasChatWindow =
    user.preferences.openChatWindows.filter(function (value) {
      return value.toString() === convoId.toString()
    }).length > 0

  if (hasChatWindow) {
    return
  }
  user.preferences.openChatWindows.push(convoId.toString())
  const u = await user.save()
  return u.preferences.openChatWindows
}

userSchema.methods.removeOpenChatWindow = async function (convoId) {
  if (convoId === undefined) {
    throw new Error('Invalid convoId')
  }
  const user = this
  const hasChatWindow =
    user.preferences.openChatWindows.filter(function (value) {
      return value.toString() === convoId.toString()
    }).length > 0

  if (!hasChatWindow) {
    return
  }
  user.preferences.openChatWindows.splice(
    user.preferences.openChatWindows.findIndex(function (item) {
      return item.toString() === convoId.toString()
    }),
    1
  )

  const u = await user.save()
  return u.preferences.openChatWindows
}

userSchema.methods.softDelete = async function () {
  const user = this

  user.deleted = true

  await user.save()
  return true
}

userSchema.statics.validate = function (password, dbPass) {
  return bcrypt.compareSync(password, dbPass)
}

/**
 * Gets all users
 *
 * @memberof User
 * @static
 * @method findAll
 *
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.findAll = async function () {
  return this.model(COLLECTION).find({})
}

/**
 * Gets user via object _id
 *
 * @memberof User
 * @static
 * @method getUser
 *
 * @param {Object} oId Object _id to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUser = async function (oId) {
  if (oId === undefined) {
    throw new Error('Invalid ObjectId - UserSchema.GetUser()')
  }

  return this.model(COLLECTION).findOne({ _id: oId })
}

/**
 * Gets user via username
 *
 * @memberof User
 * @static
 * @method getUserByUsername
 *
 * @param {String} user Username to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUserByUsername = async function (user) {
  if (user === undefined) {
    throw new Error('Invalid Username - UserSchema.GetUserByUsername()')
  }

  // username is stored lowercase via schema option — exact match is correct and avoids regex injection.
  // `+accessTokens` MUST be included so the login flow can append a new
  // per-device entry without Mongoose treating the in-memory array as
  // freshly initialized and overwriting other devices' tokens. Same
  // reason for `+accessToken` (legacy single field).
  return this.model(COLLECTION)
    .findOne({ username: String(user).toLowerCase() })
    .select('+password +accessToken +accessTokens')
    .exec()
}

userSchema.statics.getByUsername = userSchema.statics.getUserByUsername

/**
 * Gets user via email
 *
 * @memberof User
 * @static
 * @method getUserByEmail
 *
 * @param {String} email Email to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUserByEmail = async function (email) {
  if (email === undefined) {
    throw new Error('Invalid Email - UserSchema.GetUserByEmail()')
  }

  return this.model(COLLECTION).findOne({ email: email.toLowerCase() })
}

/**
 * Gets user via reset password hash
 *
 * @memberof User
 * @static
 * @method getUserByResetHash
 *
 * @param {String} hash Hash to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUserByResetHash = async function (hash) {
  if (hash === undefined) {
    throw new Error('Invalid Hash - UserSchema.GetUserByResetHash()')
  }

  return this.model(COLLECTION).findOne(
    { resetPassHash: hash, deleted: false },
    '+resetPassHash +resetPassExpire'
  )
}

userSchema.statics.getUserByL2ResetHash = async function (hash) {
  if (hash === undefined) {
    throw new Error('Invalid Hash - UserSchema.GetUserByL2ResetHash()')
  }

  return this.model(COLLECTION).findOne(
    { resetL2AuthHash: hash, deleted: false },
    '+resetL2AuthHash +resetL2AuthExpire'
  )
}

/**
 * Gets user via API Access Token
 *
 * @memberof User
 * @static
 * @method getUserByAccessToken
 *
 * @param {String} token Access Token to Query MongoDB
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUserByAccessToken = async function (token) {
  if (token === undefined) {
    throw new Error('Invalid Token - UserSchema.GetUserByAccessToken()')
  }

  // Match the token in EITHER the new per-device array or the legacy
  // single field. Once the user logs in again on the new code, the
  // legacy field is cleared by addAccessToken — until then both paths
  // remain valid so existing PWA sessions don't break on deploy.
  const user = await this.model(COLLECTION)
    .findOne(
      {
        $or: [{ 'accessTokens.token': token }, { accessToken: token }],
        deleted: false
      },
      '+password +accessTokens +accessToken'
    )
    .exec()

  if (!user) return null

  if (Array.isArray(user.accessTokens) && user.accessTokens.length > 0) {
    const entry = user.accessTokens.find((t) => t.token === token)
    if (entry) {
      const now = Date.now()
      const last = entry.lastUsedAt ? new Date(entry.lastUsedAt).getTime() : 0

      // Sliding-expiry: reject and remove tokens idle longer than the TTL.
      // The legacy `accessToken` field has no lastUsedAt — it's left alone
      // and the next login moves the user onto the array.
      if (last > 0 && now - last > ACCESS_TOKEN_IDLE_TTL_MS) {
        user.accessTokens = user.accessTokens.filter((t) => t.token !== token)
        try {
          await user.save()
        } catch (err) { /* best-effort cleanup */ }
        return null
      }

      // Opportunistic lastUsedAt update — debounced to once per minute per
      // entry to avoid writing on every API call. Fire-and-forget; auth
      // never blocks on this.
      if (now - last > 60 * 1000) {
        entry.lastUsedAt = new Date(now)
        user.save().catch(() => { /* best-effort */ })
      }
    }
  }

  return user
}

/**
 * Remove access-token array entries whose `lastUsedAt` falls outside the
 * sliding-expiry window. Runs from the weekly taskrunner cron and is also
 * exported for tests / manual ops. Idempotent.
 *
 * @memberof User
 * @static
 * @method purgeExpiredAccessTokens
 * @returns {Promise<{ usersTouched: number, tokensRemoved: number }>}
 */
userSchema.statics.purgeExpiredAccessTokens = async function () {
  const cutoff = new Date(Date.now() - ACCESS_TOKEN_IDLE_TTL_MS)
  const users = await this.model(COLLECTION)
    .find({ 'accessTokens.lastUsedAt': { $lt: cutoff } }, '+accessTokens')
    .exec()

  let tokensRemoved = 0
  let usersTouched = 0
  for (const user of users) {
    if (!Array.isArray(user.accessTokens) || user.accessTokens.length === 0) continue
    const before = user.accessTokens.length
    user.accessTokens = user.accessTokens.filter((t) => {
      const last = t.lastUsedAt ? new Date(t.lastUsedAt).getTime() : 0
      return last === 0 || Date.now() - last <= ACCESS_TOKEN_IDLE_TTL_MS
    })
    const removed = before - user.accessTokens.length
    if (removed > 0) {
      try {
        await user.save()
        tokensRemoved += removed
        usersTouched += 1
      } catch (err) {
        winston.warn('purgeExpiredAccessTokens: skipped user ' + user._id + ' — ' + err.message)
      }
    }
  }
  return { usersTouched, tokensRemoved }
}

userSchema.statics.ACCESS_TOKEN_IDLE_TTL_MS = ACCESS_TOKEN_IDLE_TTL_MS

userSchema.statics.getUserWithObject = async function (object) {
  if (!(typeof object === 'object' && object !== null)) {
    throw new Error('Invalid Object (Must be of type Object) - UserSchema.GetUserWithObject()')
  }

  const self = this

  const limit = object.limit === null ? 10 : object.limit
  const page = object.page === null ? 0 : object.page
  const search = object.search === null ? '' : object.search

  const q = self
    .model(COLLECTION)
    .find({}, '-password -resetPassHash -resetPassExpire')
    .sort({ fullname: 1 })
    .skip(page * limit)
  if (limit !== -1) {
    q.limit(limit)
  }

  if (!object.showDeleted) q.where({ deleted: false })

  if (search) {
    q.where({ fullname: new RegExp('^' + search.toLowerCase(), 'i') })
  }

  return q.exec()
}

/**
 * Gets users based on permissions > mod
 *
 * @memberof User
 * @static
 * @method getAssigneeUsers
 *
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getAssigneeUsers = async function () {
  const roles = global.roles
  if (roles === undefined) return []

  // We can't trust `role.isAgent` here. It's a Mongoose virtual that
  // `mongoose-lean-virtuals` evaluates eagerly at `getRolesLean()` time,
  // but at app boot that runs BEFORE `global.roles` is set — so the
  // virtual's `global.roles === undefined` guard returns `false` for
  // every role and freezes that stale value on the lean doc. The auth
  // middleware (`isAgentOrAdmin` etc.) later patches `isAgent` back to
  // `true` on `global.roles[i]`, but only for the role of the user who
  // happens to be hitting that middleware — so whether a given role's
  // `isAgent` is correct depends on which users were active since the
  // last container restart. After a Watchtower redeploy with no Support
  // users yet online, `Support.isAgent` stays false and getassignees
  // returns only the calling Admin.
  //
  // Read the stored `grants` array directly instead — it's plain Mongo
  // data, always populated.
  let assigneeRoles = []
  roles.forEach(function (role) {
    if (role.grants && role.grants.indexOf('agent:*') !== -1) {
      assigneeRoles.push(role._id)
    }
  })

  assigneeRoles = [...new Set(assigneeRoles)]
  const users = await this.model(COLLECTION).find({ role: { $in: assigneeRoles }, deleted: false })
  return [...users].sort((a, b) => (a.fullname || '').localeCompare(b.fullname || ''))
}

/**
 * Gets users based on roles
 *
 * @memberof User
 * @static
 * @method getUsersByRoles
 *
 * @param {Array} roles Array of role ids
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.getUsersByRoles = async function (roles) {
  if (roles === undefined) throw new Error('Invalid roles array')
  if (!Array.isArray(roles)) {
    roles = [roles]
  }

  const q = this.model(COLLECTION).find({ role: { $in: roles }, deleted: false })

  return q.exec()
}

/**
 * Creates a user with the given data object
 *
 * @memberof User
 * @static
 * @method createUser
 *
 * @param {User} data JSON data object of new User
 * @param {QueryCallback} callback MongoDB Query Callback
 */
userSchema.statics.createUser = async function (data) {
  if (data === undefined || data.username === undefined) {
    throw new Error('Invalid User Data - UserSchema.CreateUser()')
  }

  const self = this

  const items = await self.model(COLLECTION).find({ username: data.username })
  if (items.length > 0) {
    throw new Error('Username Already Exists')
  }

  return self.collection.insertOne(data)
}

/**
 * Creates a user with only Email address. Emails user password.
 *
 * @param email
 */
userSchema.statics.createUserFromEmail = async function (email) {
  if (email === undefined) {
    throw new Error('Invalid User Data - UserSchema.CreatePublicUser()')
  }

  const self = this

  const settingSchema = require('./setting')
  const userRoleDefault = await settingSchema.getSetting('role:user:default')
  if (!userRoleDefault) throw new Error('Invalid Setting - UserRoleDefault')

  const Chance = require('chance')

  const chance = new Chance()

  const plainTextPass = chance.string({
    length: 6,
    pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'
  })

  // eslint-disable-next-line new-cap
  const user = new self({
    username: email,
    email,
    password: plainTextPass,
    fullname: email,
    role: userRoleDefault.value
  })

  const items = await self.model(COLLECTION).find({ username: user.username })
  if (items.length > 0) throw new Error('Username already exists')

  const savedUser = await user.save()

  // Create a group for this user
  const GroupSchema = require('./group')
  const group = new GroupSchema({
    name: savedUser.email,
    members: [savedUser._id],
    sendMailTo: [savedUser._id],
    public: true
  })

  const savedGroup = await group.save()

  // Send welcome email
  const path = require('path')
  const mailer = require('../mailer')
  const Email = require('email-templates')
  const templateDir = path.resolve(__dirname, '..', 'mailer', 'templates')

  const emailRenderer = new Email({
    views: {
      root: templateDir,
      options: {
        extension: 'handlebars'
      }
    }
  })

  const settingSchema2 = require('./setting')
  const setting = await settingSchema2.getSetting('gen:siteurl')

  const siteUrl = setting ? setting.value : ''

  const dataObject = {
    user: savedUser,
    username: savedUser.username,
    fullname: savedUser.fullname,
    plainTextPassword: plainTextPass,
    baseUrl: siteUrl
  }

  const html = await emailRenderer.render('public-account-created', dataObject)
  const mailOptions = {
    to: savedUser.email,
    subject: require('../i18n').t('welcomeAccount', { siteTitle: 'Trudesk' }),
    html,
    generateTextFromHTML: true
  }

  await new Promise((resolve, reject) => {
    mailer.sendMail(mailOptions, function (err) {
      if (err) {
        winston.warn(err)
        return reject(err)
      }
      return resolve()
    })
  })

  return { user: savedUser, group: savedGroup }
}

userSchema.statics.getCustomers = async function (obj) {
  const limit = obj.limit || 10
  const page = obj.page || 0
  const self = this

  const accounts = await self
    .model(COLLECTION)
    .find({}, '-password -resetPassHash -resetPassExpire')
    .exec()

  const customerRoleIds = accounts.filter(function (a) {
    return !a.role.isAdmin && !a.role.isAgent
  }).map(function (a) {
    return a.role._id
  })

  const q = self
    .find({ role: { $in: customerRoleIds } }, '-password -resetPassHash -resetPassExpire')
    .sort({ fullname: 1 })
    .skip(page * limit)
    .limit(limit)

  if (!obj.showDeleted) q.where({ deleted: false })

  return q.exec()
}

userSchema.statics.getAgents = async function (obj) {
  const limit = obj.limit || 10
  const page = obj.page || 0
  const self = this

  const accounts = await self
    .model(COLLECTION)
    .find({})
    .exec()

  const agentRoleIds = accounts.filter(function (a) {
    return a.role.isAgent
  }).map(function (a) {
    return a.role._id
  })

  const q = self
    .model(COLLECTION)
    .find({ role: { $in: agentRoleIds } }, '-password -resetPassHash -resetPassExpire')
    .sort({ fullname: 1 })
    .skip(page * limit)
    .limit(limit)

  if (!obj.showDeleted) q.where({ deleted: false })

  return q.exec()
}

userSchema.statics.getAdmins = async function (obj) {
  const limit = obj.limit || 10
  const page = obj.page || 0
  const self = this

  const accounts = await self
    .model(COLLECTION)
    .find({})
    .exec()

  const adminRoleIds = accounts.filter(function (a) {
    return a.role.isAdmin
  }).map(function (a) {
    return a.role._id
  })

  const q = self
    .model(COLLECTION)
    .find({ role: { $in: adminRoleIds } }, '-password -resetPassHash -resetPassExpire')
    .sort({ fullname: 1 })
    .skip(page * limit)
    .limit(limit)

  if (!obj.showDeleted) q.where({ deleted: false })

  return q.exec()
}

module.exports = mongoose.model(COLLECTION, userSchema)
