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

const winston = require('../../../logger')
const permissions = require('../../../permissions')
const UserSchema = require('../../../models/user')
const groupSchema = require('../../../models/group')
const notificationSchema = require('../../../models/notification')
const SettingUtil = require('../../../settings/settingsUtil')
const Chance = require('chance')

const apiUsers = {}

/**
 * @api {get} /api/v1/users Gets users with query string
 * @apiName getUsers
 * @apiDescription Gets users with query string
 * @apiVersion 0.1.7
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiSuccess {boolean} success If the Request was a success
 * @apiSuccess {object} error Error, if occurred
 * @apiSuccess {number} count Count of users in array
 * @apiSuccess {array} users Users returned (populated)
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiUsers.getWithLimit = async function (req, res) {
  try {
    let limit = 10
    if (req.query.limit !== undefined) {
      limit = parseInt(req.query.limit)
    }
    const page = parseInt(req.query.page)
    const search = req.query.search

    const obj = {
      limit,
      page,
      search
    }

    const users = await UserSchema.getUserWithObject(obj)
    const grps = await groupSchema.getAllGroups()

    // Build user→groups lookup map to avoid O(users×groups) filtering
    const userGroupMap = new Map()
    for (const g of grps) {
      for (const m of g.members) {
        const memberId = m._id.toString()
        if (!userGroupMap.has(memberId)) userGroupMap.set(memberId, [])
        userGroupMap.get(memberId).push({ name: g.name, _id: g._id })
      }
    }

    const result = []
    for (const u of users) {
      const user = u.toObject()
      user.groups = userGroupMap.get(user._id.toString()) || []
      result.push(stripUserFields(user))
    }

    return res.json({ success: true, count: result.length, users: result })
  } catch (err) {
    return res.status(400).json({ error: 'Error: ' + err.message })
  }
}

/**
 * @api {post} /api/v1/users/create Create Account
 * @apiName createAccount
 * @apiDescription Creates an account with the given post data.
 * @apiVersion 0.1.7
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiParamExample {json} Request-Example:
 * {
 *      "aUsername":    "user.name",
 *      "aPass":        "password",
 *      "aPassConfirm": "password",
 *      "aFullname":    "fullname",
 *      "aEmail":       "email@email.com",
 *      "aRole":        {RoleId},
 *      "aTitle":       "User Title",
 *      "aGrps":        [{GroupId}]
 * }
 *
 * @apiSuccess {boolean} success If the Request was a success
 * @apiSuccess {object} error Error, if occurred
 * @apiSuccess {object} account Saved Account Object
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiUsers.create = async function (req, res) {
  const response = {}
  response.success = true

  const postData = req.body

  if (postData === undefined || !(typeof postData === 'object' && postData !== null)) {
    return res.status(400).json({ success: false, error: 'Invalid Post Data' })
  }

  const propCheck = ['aUsername', 'aPass', 'aPassConfirm', 'aFullname', 'aEmail', 'aRole']

  if (
    !propCheck.every(function (x) {
      return x in postData
    })
  ) {
    return res.status(400).json({ success: false, error: 'Invalid Post Data' })
  }

  if (postData.aGrps === undefined || postData.aGrps === null || !Array.isArray(postData.aGrps)) {
    return res.status(400).json({ success: false, error: 'Invalid Group Array' })
  }

  if (postData.aPass !== postData.aPassConfirm) { return res.status(400).json({ success: false, error: 'Invalid Password Match' }) }

  try {
    const content = await SettingUtil.getSettings()
    const settings = content.data.settings
    if (settings.accountsPasswordComplexity.value) {
      const passwordComplexity = require('../../../settings/passwordComplexity')
      if (!passwordComplexity.validate(postData.aPass)) { throw new Error('Password does not meet minimum requirements.') }
    }

    const chance = new Chance()

    const account = new UserSchema({
      username: postData.aUsername,
      password: postData.aPass,
      fullname: postData.aFullname,
      email: postData.aEmail,
      accessToken: chance.hash(),
      role: postData.aRole
    })

    if (postData.aTitle) {
      account.title = postData.aTitle
    }

    const a = await account.save()
    const populatedAccount = await a.populate('role')

    response.account = populatedAccount.toObject()
    delete response.account.password

    const groups = []
    for (const id of postData.aGrps) {
      if (id === undefined) continue
      const grp = await groupSchema.getGroupById(id)
      if (!grp) throw new Error(`Invalid Group (${id}) - Group not found. Check Group ID.`)

      await grp.addMember(a._id)
      await grp.save()
      groups.push(grp)
    }

    response.account.groups = groups

    return res.json(response)
  } catch (e) {
    response.success = false
    response.error = e
    winston.debug(response)
    return res.status(400).json(response)
  }
}

/**
 * @api {post} /api/v1/public/account/create Create Public Account
 * @apiName createPublicAccount
 * @apiDescription Creates an account with the given post data.
 * @apiVersion 0.1.8
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiParamExample {json} Request-Example:
 * {
 *      "aFullname":    "user name",
 *      "aEmail":       "email@email.com""
 *      "aPassword":    "password",
 * }
 *
 * @apiSuccess {boolean} success If the Request was a success
 * @apiSuccess {object} error Error, if occurred
 * @apiSuccess {object} account Saved Account Object
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiUsers.createPublicAccount = async function (req, res) {
  const SettingSchema = require('../../../models/setting')

  const response = {}
  response.success = true
  const postData = req.body
  if (!(typeof postData === 'object' && postData !== null)) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    // Same pitfall as allowPublicTickets: the previous `!doc` check only blocked the
    // first-ever attempt. Once an admin had touched the toggle in the UI, the doc
    // existed with value=false and this check silently passed.
    const allowUserRegistration = await SettingSchema.getSetting('allowUserRegistration:enable')
    if (!allowUserRegistration || allowUserRegistration.value !== true) {
      winston.warn('Public account creation was attempted while disabled!')
      throw new Error('Public account creation is disabled.')
    }

    const roleDefault = await SettingSchema.getSetting('role:user:default')
    if (!roleDefault) {
      winston.error('No Default User Role Set. (Settings > Permissions > Default User Role)')
      throw new Error('No Default Role Set. Please contact administrator.')
    }

    const passwordComplexitySetting = await SettingSchema.getSetting('accountsPasswordComplexity:enable')
    if (!passwordComplexitySetting || passwordComplexitySetting.value === true) {
      const passwordComplexity = require('../../../settings/passwordComplexity')
      if (!passwordComplexity.validate(postData.user.password)) { throw new Error('Password does not minimum requirements.') }
    }

    const LocalUserSchema = require('../../../models/user')

    // Accept an explicit username from the form (preferred), fall back to email
    // for clients that haven't been updated to ask for one. Validate format
    // strictly so we don't end up with junk in the unique index.
    const rawUsername = (postData.user.username || postData.user.email || '').toString().trim()
    if (!rawUsername) throw new Error('Username is required.')
    if (rawUsername.length < 3 || rawUsername.length > 50) {
      throw new Error('Username must be 3–50 characters long.')
    }
    if (!/^[A-Za-z0-9._-]+$/.test(rawUsername) && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rawUsername)) {
      throw new Error('Username may only contain letters, digits, dot, dash, or underscore (or be a valid email).')
    }
    const normalizedUsername = rawUsername.toLowerCase()

    // Pre-flight uniqueness check so we return a clean error before Mongoose throws an opaque E11000.
    const existing = await LocalUserSchema.findOne({
      $or: [{ username: normalizedUsername }, { email: postData.user.email.toLowerCase() }]
    })
    if (existing) {
      throw new Error(
        existing.username === normalizedUsername
          ? 'Username already exists.'
          : 'Email already exists.'
      )
    }

    const user = new LocalUserSchema({
      username: normalizedUsername,
      password: postData.user.password,
      fullname: postData.user.fullname,
      email: postData.user.email,
      role: roleDefault.value
    })

    const savedUser = await user.save()

    // Generate an API access token so the user can immediately log in via
    // the API (PWA, mobile). Without this, POST /api/v1/login returns
    // "No API Key assigned to this User." even though credentials are valid.
    await savedUser.addAccessToken()

    const GroupSchema = require('../../../models/group')
    const group = new GroupSchema({
      name: savedUser.email,
      members: [savedUser._id],
      sendMailTo: [savedUser._id],
      public: true
    })

    const savedGroup = await group.save()

    // Auto-add new users to all public groups and all teams so they can
    // immediately see and create tickets. In a small org (THW-OV) every
    // registered user belongs to the same groups/teams.
    try {
      const publicGroups = await GroupSchema.find({ public: true, _id: { $ne: savedGroup._id } })
      for (const pg of publicGroups) {
        pg.members.addToSet(savedUser._id)
        await pg.save()
      }

      const TeamSchema = require('../../../models/team')
      const allTeams = await TeamSchema.find({})
      for (const team of allTeams) {
        team.members.addToSet(savedUser._id)
        await team.save()
      }
    } catch (autoAssignErr) {
      winston.warn('Failed to auto-assign user to groups/teams: ' + autoAssignErr.message)
    }

    delete savedUser.password
    savedUser.password = undefined

    return res.json({
      success: true,
      userData: { user: savedUser, group: savedGroup }
    })
  } catch (err) {
    winston.debug(err)
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiUsers.profileUpdate = async function (req, res) {
  if (!req.user) return res.status(400).json({ success: false, error: 'Invalid Post Data' })
  const username = req.user.username
  if (username === null || username === undefined) { return res.status(400).json({ success: false, error: 'Invalid Post Data' }) }

  const data = req.body
  let passwordUpdated = false

  const obj = {
    fullname: data.aFullname,
    title: data.aTitle,
    password: data.aPassword,
    passconfirm: data.aPassConfirm,
    email: data.aEmail
  }

  try {
    const content = await SettingUtil.getSettings()
    const settings = content.data.settings
    const passwordComplexityEnabled = settings.accountsPasswordComplexity.value

    const user = await UserSchema.getUserByUsername(username)
    if (!user) throw new Error('Invalid User Object')

    obj._id = user._id

    if (
      obj.password !== undefined &&
      obj.password && obj.password.length > 0 &&
      obj.passconfirm !== undefined &&
      obj.passconfirm && obj.passconfirm.length > 0
    ) {
      if (obj.password === obj.passconfirm) {
        if (passwordComplexityEnabled) {
          const passwordComplexity = require('../../../settings/passwordComplexity')
          if (!passwordComplexity.validate(obj.password)) throw new Error('Password does not meet requirements')
        }

        user.password = obj.password
        passwordUpdated = true
      }
    }

    if (obj.fullname !== undefined && obj.fullname.length > 0) user.fullname = obj.fullname
    if (obj.email !== undefined && obj.email.length > 0) user.email = obj.email
    if (obj.title !== undefined && obj.title.length > 0) user.title = obj.title

    const nUser = await user.save()
    const populatedUser = await nUser.populate('role')
    const resUser = stripUserFields(populatedUser)

    const groups = await groupSchema.getAllGroupsOfUser(obj._id)

    const userResult = resUser.toJSON()
    userResult.groups = groups.map(function (g) {
      return { _id: g._id, name: g.name }
    })

    if (passwordUpdated) {
      const Session = require('../../../models/session')
      await Session.destroy(userResult._id)
    }

    return res.json({ success: true, user: userResult })
  } catch (err) {
    winston.debug(err)
    return res.status(400).json({ success: false, error: err })
  }
}

/**
 * @api {put} /api/v1/users/:username Update User
 * @apiName updateUser
 * @apiDescription Updates a single user.
 * @apiVersion 0.1.7
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiParamExample {json} Request:
 * {
        aId:            {{_id}},
        aUsername:      {{username}},
        aFullname:      {{fullname}},
        aTitle:         {{title}},
        aPass:          {{password}},
        aPassconfirm:   {{password_confirm}},
        aEmail:         {{email}},
        aRole:          {{role.id}},
        aGrps:          [{{group._id}}]
 * }
 *
 * @apiSuccess {object} user Saved User Object [Stripped]
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiUsers.update = async function (req, res) {
  const username = req.params.username
  if (username === null || username === undefined) { return res.status(400).json({ success: false, error: 'Invalid Post Data' }) }

  const data = req.body
  // saveGroups - Profile saving where groups are not sent
  const saveGroups = data.saveGroups !== undefined ? data.saveGroups : true
  let passwordUpdated = false

  const obj = {
    fullname: data.aFullname,
    title: data.aTitle,
    password: data.aPass,
    passconfirm: data.aPassConfirm,
    email: data.aEmail,
    role: data.aRole,
    groups: data.aGrps
  }

  if (obj.groups === null || obj.groups === undefined) {
    obj.groups = []
  } else if (!Array.isArray(obj.groups)) {
    obj.groups = [obj.groups]
  }

  try {
    const content = await SettingUtil.getSettings()
    const settings = content.data.settings
    const passwordComplexityEnabled = settings.accountsPasswordComplexity.value

    const user = await UserSchema.getUserByUsername(username)
    if (!user) throw new Error('Invalid User Object')

    obj._id = user._id

    if (
      obj.password !== undefined &&
      obj.password && obj.password.length > 0 &&
      obj.passconfirm !== undefined &&
      obj.passconfirm && obj.passconfirm.length > 0
    ) {
      if (obj.password === obj.passconfirm) {
        if (passwordComplexityEnabled) {
          const passwordComplexity = require('../../../settings/passwordComplexity')
          if (!passwordComplexity.validate(obj.password)) throw new Error('Password does not meet requirements')
        }

        user.password = obj.password
        passwordUpdated = true
      }
    }

    if (obj.fullname !== undefined && obj.fullname.length > 0) user.fullname = obj.fullname
    if (obj.email !== undefined && obj.email.length > 0) user.email = obj.email
    if (obj.title !== undefined && obj.title.length > 0) user.title = obj.title
    if (obj.role !== undefined && obj.role.length > 0) user.role = obj.role

    const nUser = await user.save()
    const populatedUser = await nUser.populate('role')
    const resUser = stripUserFields(populatedUser)

    let userGroups
    if (!saveGroups) {
      userGroups = await groupSchema.getAllGroupsOfUser(obj._id)
    } else {
      userGroups = []
      const allGroups = await groupSchema.getAllGroups()
      for (const grp of allGroups) {
        if (obj.groups.includes(grp._id.toString())) {
          if (grp.isMember(obj._id)) {
            userGroups.push(grp)
          } else {
            const result = await grp.addMember(obj._id)
            if (result) {
              await grp.save()
              userGroups.push(grp)
            }
          }
        } else {
          // Remove Member from group
          const result = await grp.removeMember(obj._id)
          if (result) {
            await grp.save()
          }
        }
      }
    }

    const userResult = resUser.toJSON()
    userResult.groups = userGroups.map(function (g) {
      return { _id: g._id, name: g.name }
    })

    if (passwordUpdated) {
      const Session = require('../../../models/session')
      await Session.destroy(userResult._id)
    }

    return res.json({ success: true, user: userResult })
  } catch (err) {
    winston.debug(err)
    return res.status(400).json({ success: false, error: err })
  }
}

/**
 * @api {put} /api/v1/users/:username/updatepreferences Updates User Preferences
 * @apiName updatePreferences
 * @apiDescription Updates a single user preference.
 * @apiVersion 0.1.0
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -H "accesstoken: {accesstoken}" -X PUT -d "{\"preference\":\"{preference_name}\",\"value\":{value}}" -l http://localhost/api/v1/users/{username}/updatepreferences
 *
 * @apiParamExample {json} Request:
 * {
 *      "preference": "preference_name",
 *      "value": "preference_value"
 * }
 *
 * @apiSuccess {object} user Saved User Object [Stripped]
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiUsers.updatePreferences = async function (req, res) {
  const username = req.params.username
  if (typeof username === 'undefined') {
    return res.status(400).json({ success: false, error: 'Invalid Request' })
  }

  try {
    const data = req.body
    const preference = data.preference
    const value = data.value

    const user = await UserSchema.getUserByUsername(username)

    if (user.preferences === null) {
      user.preferences = {}
    }

    user.preferences[preference] = value

    const u = await user.save()
    const resUser = stripUserFields(u)

    return res.json({ success: true, user: resUser })
  } catch (err) {
    winston.warn('[API:USERS:UpdatePreferences] Error= ' + err)
    return res.status(400).json({ success: false, error: err })
  }
}

/**
 * @api {delete} /api/v1/users/:username Delete / Disable User
 * @apiName deleteUser
 * @apiDescription Disables or Deletes the giving user via username
 * @apiVersion 0.1.7
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -X DELETE -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/:username
 *
 * @apiSuccess {boolean}     success    Was the user successfully Deleted or disabled.
 *
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiUsers.deleteUser = async function (req, res) {
  const username = req.params.username

  if (username === undefined || username === null) return res.status(400).json({ error: 'Invalid Request' })

  try {
    const user = await UserSchema.getUserByUsername(username)
    if (user === null) {
      throw new Error('Invalid User')
    }

    if (user.username.toLowerCase() === req.user.username) {
      throw new Error('Cannot remove yourself!')
    }

    if (!permissions.canThis(req.user.role, 'accounts:delete')) throw new Error('Access Denied')

    const ticketSchema = require('../../../models/ticket')
    const tickets = await ticketSchema.find({ owner: user._id })
    const hasTickets = tickets.length > 0

    const conversationSchema = require('../../../models/chat/conversation')
    const conversations = await conversationSchema.getConversationsWithLimit(user._id, 10)
    const hasConversations = conversations.length > 0

    const assignedTickets = await ticketSchema.find({ assignee: user._id })
    const isAssignee = assignedTickets.length > 0

    let disabled
    if (hasTickets || hasConversations || isAssignee) {
      // Disable if the user has tickets or conversations
      await user.softDelete()
      disabled = true
    } else {
      await user.deleteOne()
      disabled = false
    }

    return res.json({ success: true, disabled })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

/**
 * @api {get} /api/v1/users/:username/enable Enable User
 * @apiName enableUser
 * @apiDescription Enable the giving user via username
 * @apiVersion 0.1.7
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -X DELETE -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/:username/enable
 *
 * @apiSuccess {boolean}     success    Was the user successfully enabled.
 *
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiUsers.enableUser = async function (req, res) {
  const username = req.params.username
  if (username === undefined) return res.status(400).json({ error: 'Invalid Request' })

  try {
    const user = await UserSchema.getUserByUsername(username)

    if (user === undefined || user === null) return res.status(400).json({ error: 'Invalid Request' })

    if (!permissions.canThis(req.user.role, 'accounts:delete')) { return res.status(401).json({ error: 'Invalid Permissions' }) }

    user.deleted = false

    await user.save()
    res.json({ success: true })
  } catch (err) {
    winston.debug(err)
    return res.status(400).json({ error: err.message })
  }
}

/**
 * @api {get} /api/v1/users/:username Get User
 * @apiName getUser
 * @apiDescription Gets the user via the given username
 * @apiVersion 0.1.0
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/:username
 *
 * @apiSuccess {object}     _id                 The MongoDB ID
 * @apiSuccess {string}     username            Username of the User
 * @apiSuccess {string}     fullname            Fullname of the User
 * @apiSuccess {string}     email               Email Address of the User
 * @apiSuccess {string}     role                Assigned Permission Role of the user
 * @apiSuccess {string}     title               Title of the User
 * @apiSuccess {string}     image               Image filename for the user's profile picture
 * @apiSuccess {array}      iOSDeviceTokens     iOS Device Tokens for push notifications
 *
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiUsers.single = async function (req, res) {
  const username = req.params.username
  if (username === undefined) return res.status(400).json({ error: 'Invalid Request.' })

  try {
    const response = {
      success: true,
      groups: []
    }

    let user = await UserSchema.getUserByUsername(username)
    if (user === undefined || user === null) throw new Error('Invalid Request')

    user = stripUserFields(user)
    response.user = user

    const grps = await groupSchema.getAllGroupsOfUserNoPopulate(user._id)
    response.groups = grps.map(function (o) {
      return o._id
    })

    res.json(response)
  } catch (err) {
    return res.status(400).json({ error: err })
  }
}

/**
 * @api {get} /api/v1/users/notificationCount Get Notification Count
 * @apiName getNotificationCount
 * @apiDescription Gets the current notification count for the currently logged in user.
 * @apiVersion 0.1.0
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/notificationCount
 *
 * @apiSuccess {string}     count   The Notification Count
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiUsers.notificationCount = async function (req, res) {
  try {
    const count = await notificationSchema.getUnreadCount(req.user._id)
    return res.json({ success: true, count: count.toString() })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiUsers.getNotifications = async function (req, res) {
  try {
    const notifications = await notificationSchema.findAllForUser(req.user._id)
    return res.json({ success: true, notifications })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

/**
 * @api {post} /api/v1/users/:id/generateapikey Generate API Key
 * @apiName generateApiKey
 * @apiDescription Generates an API key for the given user id
 * @apiVersion 0.1.7
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/:id/generateapikey
 *
 * @apiSuccess {string}     token   Generated API Key
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiUsers.generateApiKey = async function (req, res) {
  const id = req.params.id
  if (id === undefined || id === null) return res.status(400).json({ error: 'Invalid Request' })
  if (!req.user.role.isAdmin && req.user._id.toString() !== id) { return res.status(401).json({ success: false, error: 'Unauthorized' }) }

  try {
    const user = await UserSchema.getUser(id)
    if (!user) return res.status(400).json({ success: false, error: 'Invalid Request' })

    const token = await user.addAccessToken()
    res.json({ token })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid Request' })
  }
}

/**
 * @api {post} /api/v1/users/:id/removeapikey Removes API Key
 * @apiName removeApiKey
 * @apiDescription Removes API key for the given user id
 * @apiVersion 0.1.7
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/:id/removeapikey
 *
 * @apiSuccess {boolean}     success   Successful?
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiUsers.removeApiKey = async function (req, res) {
  const id = req.params.id
  if (id === undefined || id === null) return res.status(400).json({ error: 'Invalid Request' })

  if (!req.user.isAdmin && req.user._id.toString() !== id) return res.status(401).json({ success: 'Unauthorized' })

  try {
    const user = await UserSchema.getUser(id)
    await user.removeAccessToken()
    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid Request', fullError: err })
  }
}

/**
 * @api {post} /api/v1/users/:id/generatel2auth Generate Layer Two Auth
 * @apiName generateL2Auth
 * @apiDescription Generate a new layer two auth for the given user id
 * @apiVersion 0.1.8
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/:id/generatel2auth
 *
 * @apiSuccess {boolean}     success   Successful?
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiUsers.generateL2Auth = async function (req, res) {
  const id = req.params.id
  if (id.toString() !== req.user._id.toString()) {
    return res.status(400).json({ success: false, error: 'Invalid Account Owner!' })
  }

  try {
    const user = await UserSchema.getUser(id)
    const generatedKey = await user.generateL2Auth()
    req.session.l2auth = 'totp'
    return res.json({ success: true, generatedKey })
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Invalid Request' })
  }
}

/**
 * @api {post} /api/v1/users/:id/removel2auth Removes Layer Two Auth
 * @apiName removeL2Auth
 * @apiDescription Removes Layer Two Auth for the given user id
 * @apiVersion 0.1.8
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/:id/removel2auth
 *
 * @apiSuccess {boolean}     success   Successful?
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiUsers.removeL2Auth = async function (req, res) {
  const id = req.params.id
  if (id.toString() !== req.user._id.toString()) {
    return res.status(400).json({ success: false, error: 'Invalid Account Owner!' })
  }

  try {
    const user = await UserSchema.getUser(id)
    await user.removeL2Auth()
    req.session.l2auth = null
    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Invalid Request' })
  }
}

/**
 * @api {post} /api/v1/users/checkemail
 * @apiName checkEmail
 * @apiDescription Returns a true if email exists
 * @apiVersion 0.1.7
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/checkemail
 *
 * @apiSuccess {boolean}     success   Successful?
 * @apiSuccess {boolean}     emailexist Does Email Exist?
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */

apiUsers.checkEmail = async function (req, res) {
  const email = req.body.email

  if (email === undefined || email === null) {
    return res.status(400).json({ success: false, error: 'Invalid Post Data' })
  }

  try {
    const users = await UserSchema.getUserByEmail(email)

    if (users) {
      return res.json({ success: true, exist: true })
    }

    return res.json({ success: true, exist: false })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

/**
 * @api {get} /api/v1/users/getassignees Get Assignees
 * @apiName getassignees
 * @apiDescription Returns a list of assignable users
 * @apiVersion 0.1.7
 * @apiGroup User
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/users/getassignees
 *
 * @apiSuccess {boolean}     success   Successful?
 * @apiSuccess {array}       users     Array of Assignees
 *
 * @apiError InvalidRequest The request was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiUsers.getAssingees = async function (req, res) {
  try {
    const users = await UserSchema.getAssigneeUsers()

    const strippedUsers = users.map(function (user) {
      return stripUserFields(user)
    })

    return res.json({ success: true, users: strippedUsers })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid Request' })
  }
}

apiUsers.getGroups = async function (req, res) {
  try {
    if (req.user.role.isAdmin || req.user.role.isAgent) {
      const departmentSchema = require('../../../models/department')
      const groups = await departmentSchema.getDepartmentGroupsOfUser(req.user._id)

      const mappedGroups = groups.map(function (g) {
        return g._id
      })

      return res.json({ success: true, groups: mappedGroups })
    } else {
      if ((req.user.username || '').toLowerCase() !== (req.params.username || '').toLowerCase()) { return res.status(400).json({ success: false, error: 'Invalid API Call' }) }

      const groups = await groupSchema.getAllGroupsOfUserNoPopulate(req.user._id)

      const mappedGroups = groups.map(function (g) {
        return g._id
      })

      return res.json({ success: true, groups: mappedGroups })
    }
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

function stripUserFields (user) {
  user.password = undefined
  user.accessToken = undefined
  user.__v = undefined
  user.tOTPKey = undefined
  user.iOSDeviceTokens = undefined

  return user
}

module.exports = apiUsers
