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
const _ = require('lodash')
const Chance = require('chance')
const utils = require('../helpers/utils')

// Required for linkage
require('./role')

const SALT_FACTOR = 10
const COLLECTION = 'accounts'

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
  accessToken: { type: String, sparse: true, select: false },

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

userSchema.methods.addAccessToken = async function () {
  const user = this
  const date = new Date()
  const salt = user.username.toString() + date.toISOString()
  const chance = new Chance(salt)
  user.accessToken = chance.hash()
  await user.save()
  return user.accessToken
}

userSchema.methods.removeAccessToken = async function () {
  const user = this
  if (!user.accessToken) return

  user.accessToken = undefined
  await user.save()
}

userSchema.methods.generateL2Auth = async function () {
  const user = this
  if (_.isUndefined(user.tOTPKey) || _.isNull(user.tOTPKey)) {
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
    _.filter(user.preferences.openChatWindows, function (value) {
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
    _.filter(user.preferences.openChatWindows, function (value) {
      return value.toString() === convoId.toString()
    }).length > 0

  if (!hasChatWindow) {
    return
  }
  user.preferences.openChatWindows.splice(
    _.findIndex(user.preferences.openChatWindows, function (item) {
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
  if (_.isUndefined(oId)) {
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
  if (_.isUndefined(user)) {
    throw new Error('Invalid Username - UserSchema.GetUserByUsername()')
  }

  return this.model(COLLECTION)
    .findOne({ username: new RegExp('^' + user + '$', 'i') })
    .select('+password +accessToken')
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
  if (_.isUndefined(email)) {
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
  if (_.isUndefined(hash)) {
    throw new Error('Invalid Hash - UserSchema.GetUserByResetHash()')
  }

  return this.model(COLLECTION).findOne(
    { resetPassHash: hash, deleted: false },
    '+resetPassHash +resetPassExpire'
  )
}

userSchema.statics.getUserByL2ResetHash = async function (hash) {
  if (_.isUndefined(hash)) {
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
  if (_.isUndefined(token)) {
    throw new Error('Invalid Token - UserSchema.GetUserByAccessToken()')
  }

  return this.model(COLLECTION).findOne({ accessToken: token, deleted: false }, '+password')
}

userSchema.statics.getUserWithObject = async function (object) {
  if (!_.isObject(object)) {
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

  if (!_.isEmpty(search)) {
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
  if (_.isUndefined(roles)) return []

  let assigneeRoles = []
  roles.forEach(function (role) {
    if (role.isAgent) assigneeRoles.push(role._id)
  })

  assigneeRoles = _.uniq(assigneeRoles)
  const users = await this.model(COLLECTION).find({ role: { $in: assigneeRoles }, deleted: false })
  return _.sortBy(users, 'fullname')
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
  if (_.isUndefined(roles)) throw new Error('Invalid roles array')
  if (!_.isArray(roles)) {
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
  if (_.isUndefined(data) || _.isUndefined(data.username)) {
    throw new Error('Invalid User Data - UserSchema.CreateUser()')
  }

  const self = this

  const items = await self.model(COLLECTION).find({ username: data.username })
  if (_.size(items) > 0) {
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
  if (_.isUndefined(email)) {
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
  if (_.size(items) > 0) throw new Error('Username already exists')

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

  const customerRoleIds = _.filter(accounts, function (a) {
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

  const agentRoleIds = _.filter(accounts, function (a) {
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

  const adminRoleIds = _.filter(accounts, function (a) {
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
