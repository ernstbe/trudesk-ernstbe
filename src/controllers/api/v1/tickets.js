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

var _ = require('lodash')
var moment = require('moment-timezone')
var winston = require('../../../logger')
var permissions = require('../../../permissions')
var emitter = require('../../../emitter')
var xss = require('xss')
var sanitizeHtml = require('sanitize-html')

var apiTickets = {}

function buildGraphData (arr, days, callback) {
  var graphData = []
  var today = moment()
    .hour(23)
    .minute(59)
    .second(59)
  var timespanArray = []
  for (var i = days; i--; ) {
    timespanArray.push(i)
  }

  _.each(timespanArray, function (day) {
    var obj = {}
    var d = today.clone().subtract(day, 'd')
    obj.date = d.format('YYYY-MM-DD')

    var $dateCount = _.filter(arr, function (v) {
      return (
        v.date <= d.toDate() &&
        v.date >=
          d
            .clone()
            .subtract(1, 'd')
            .toDate()
      )
    })

    $dateCount = _.size($dateCount)
    obj.value = $dateCount
    graphData.push(obj)
  })

  if (_.isFunction(callback)) {
    return callback(graphData)
  }

  return graphData
}

function buildAvgResponse (ticketArray, callback) {
  var cbObj = {}
  var $ticketAvg = []
  _.each(ticketArray, function (ticket) {
    if (_.isUndefined(ticket.comments) || _.size(ticket.comments) < 1) return

    var ticketDate = moment(ticket.date)
    var firstCommentDate = moment(ticket.comments[0].date)

    var diff = firstCommentDate.diff(ticketDate, 'seconds')
    $ticketAvg.push(diff)
  })

  var ticketAvgTotal = _($ticketAvg).reduce(function (m, x) {
    return m + x
  }, 0)

  var tvt = moment.duration(Math.round(ticketAvgTotal / _.size($ticketAvg)), 'seconds').asHours()
  cbObj.avgResponse = Math.floor(tvt)

  if (_.isFunction(callback)) {
    return callback(cbObj)
  }

  return cbObj
}

/**
 * @api {get} /api/v1/tickets/ Get Tickets
 * @apiName getTickets
 * @apiDescription Gets tickets for the given User
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets
 *
 * @apiSuccess {object}     _id                 The MongoDB ID
 * @apiSuccess {number}     uid                 Unique ID (seq num)
 * @apiSuccess {object}     owner               User
 * @apiSuccess {object}     owner._id           The MongoDB ID of Owner
 * @apiSuccess {string}     owner.username      Username
 * @apiSuccess {string}     owner.fullname      User Full Name
 * @apiSuccess {string}     owner.email         User Email Address
 * @apiSuccess {string}     owner.role          User Permission Role
 * @apiSuccess {string}     owner.title         User Title
 * @apiSuccess {string}     owner.image         User Image Rel Path
 * @apiSuccess {object}     group               Group
 * @apiSuccess {object}     group._id           Group MongoDB ID
 * @apiSuccess {string}     group.name          Group Name
 * @apiSuccess {object}     assignee            User Assigned
 * @apiSuccess {object}     assignee._id        The MongoDB ID of Owner
 * @apiSuccess {string}     assignee.username   Username
 * @apiSuccess {string}     assignee.fullname   User Full Name
 * @apiSuccess {string}     assignee.email      User Email Address
 * @apiSuccess {string}     assignee.role       User Permission Role
 * @apiSuccess {string}     assignee.title      User Title
 * @apiSuccess {string}     assignee.image      User Image Rel Path
 * @apiSuccess {date}       date                Created Date
 * @apiSuccess {date}       updated             Last Updated DateTime
 * @apiSuccess {boolean}    deleted             Deleted Flag
 * @apiSuccess {object}     type                Ticket Type
 * @apiSuccess {object}     type._id            Type MongoDB ID
 * @apiSuccess {string}     type.name           Type Name
 * @apiSuccess {number}     status              Status of Ticket
 * @apiSuccess {number}     prioirty            Prioirty of Ticket
 * @apiSuccess {array}      tags                Array of Tags
 * @apiSuccess {string}     subject             Subject Text
 * @apiSuccess {string}     issue               Issue Text
 * @apiSuccess {date}       closedDate          Date Ticket was closed
 * @apiSuccess {array}      comments            Array of Comments
 * @apiSuccess {array}      attachments         Array of Attachments
 * @apiSuccess {array}      history             Array of History items
 *
 */
apiTickets.get = async function (req, res) {
  var l = req.query.limit ? req.query.limit : 10
  var limit = parseInt(l)
  var page = parseInt(req.query.page)
  var assignedSelf = req.query.assignedself
  var status = req.query.status
  var user = req.user

  var object = {
    user: user,
    limit: limit,
    page: page,
    assignedSelf: assignedSelf,
    status: status
  }

  var ticketModel = require('../../../models/ticket')
  var groupModel = require('../../../models/group')
  var departmentModel = require('../../../models/department')

  try {
    var grps
    if (user.role.isAdmin || user.role.isAgent) {
      grps = await departmentModel.getDepartmentGroupsOfUser(user._id)
    } else {
      grps = await groupModel.getAllGroupsOfUserNoPopulate(user._id)
    }

    if (permissions.canThis(user.role, 'tickets:public')) {
      var publicGroups = await groupModel.getAllPublicGroups()
      grps = grps.concat(publicGroups)
    }

    var results = await ticketModel.getTicketsWithObject(grps, object)

    if (!permissions.canThis(user.role, 'comments:view')) {
      _.each(results, function (ticket) {
        ticket.comments = []
      })
    }

    if (!permissions.canThis(user.role, 'tickets:notes')) {
      _.each(results, function (ticket) {
        ticket.notes = []
      })
    }

    // sanitize
    _.each(results, function (ticket) {
      ticket.subscribers = _.map(ticket.subscribers, function (s) {
        return s._id
      })

      ticket.history = _.map(ticket.history, function (h) {
        var obj = {
          date: h.date,
          _id: h._id,
          action: h.action,
          description: h.description,
          owner: _.clone(h.owner)
        }
        obj.owner.role = h.owner.role._id
        return obj
      })

      ticket.owner.role = ticket.owner.role._id
    })

    return res.json(results)
  } catch (err) {
    return res.send('Error: ' + err.message)
  }
}

apiTickets.getByGroup = async function (req, res) {
  var groupId = req.params.id
  if (!groupId) return res.status(400).json({ success: false, error: 'Invalid Group Id' })

  var limit = req.query.limit ? Number(req.query.limit) : 50
  var page = req.query.page ? Number(req.query.page) : 0

  var obj = {
    limit: limit,
    page: page
  }

  try {
    var ticketSchema = require('../../../models/ticket')
    var tickets = await ticketSchema.getTicketsWithObject([groupId], obj)
    return res.json({ success: true, tickets: tickets, count: tickets.length })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

apiTickets.getCountByGroup = async function (req, res) {
  var groupId = req.params.id
  if (!groupId) return res.status(400).json({ success: false, error: 'Invalid Group Id' })
  if (_.isUndefined(req.query.type) || _.isUndefined(req.query.value))
    return res.status(400).json({ success: false, error: 'Invalid QueryString' })

  var type = req.query.type
  var value = req.query.value

  var ticketSchema = require('../../../models/ticket')

  var obj = {}

  try {
    switch (type.toLowerCase()) {
      case 'status':
        obj.status = [Number(value)]
        break
      case 'tickettype':
        obj.filter = {
          types: [value]
        }
        break
      default:
        return res.status(400).json({ success: false, error: 'Unsupported type query' })
    }

    var count = await ticketSchema.getCountWithObject([groupId], obj)
    return res.json({ success: true, count: count })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

/**
 * @api {get} /api/v1/tickets/search/?search={searchString} Get Tickets by Search String
 * @apiName search
 * @apiDescription Gets tickets via search string
 * @apiVersion 0.1.7
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/search/?search=searchString
 *
 * @apiSuccess {number} count Count of Tickets Array
 * @apiSuccess {array} tickets Tickets Array
 *
 * @apiError InvalidRequest The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Ticket"
 }
 */
apiTickets.search = async function (req, res) {
  var searchString = req.query.search

  var ticketModel = require('../../../models/ticket')
  var groupModel = require('../../../models/group')
  var departmentModel = require('../../../models/department')

  try {
    var grps
    if (req.user.role.isAdmin || req.user.role.isAgent) {
      grps = await departmentModel.getDepartmentGroupsOfUser(req.user._id)
    } else {
      grps = await groupModel.getAllGroupsOfUserNoPopulate(req.user._id)
    }

    if (permissions.canThis(req.user.role, 'tickets:public')) {
      var publicGroups = await groupModel.getAllPublicGroups()
      grps = grps.concat(publicGroups)
    }

    var results = await ticketModel.getTicketsWithSearchString(grps, searchString)

    if (!permissions.canThis(req.user.role.role, 'tickets:notes')) {
      _.each(results, function (ticket) {
        ticket.notes = []
      })
    }

    return res.json({
      success: true,
      error: null,
      count: _.size(results),
      totalCount: _.size(results),
      tickets: _.sortBy(results, 'uid').reverse()
    })
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Error - ' + err.message })
  }
}

/**
 * @api {post} /api/v1/tickets/create Create Ticket
 * @apiName createTicket
 * @apiDescription Creates a ticket with the given post data.
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiParamExample {json} Request-Example:
 * {
 *      "subject": "Subject",
 *      "issue": "Issue Exmaple",
 *      "owner": {OwnerId},
 *      "group": {GroupId},
 *      "type": {TypeId},
 *      "prioirty": {PriorityId},
 *      "tags": [{tagId}]
 * }
 *
 * @apiExample Example usage:
 * curl -X POST
 *      -H "Content-Type: application/json"
 *      -H "accesstoken: {accesstoken}"
 *      -d "{\"subject\":\"{subject}\",\"owner\":{ownerId}, group: \"{groupId}\", type: \"{typeId}\", issue: \"{issue}\", prioirty: \"{prioirty}\"}"
 *      -l http://localhost/api/v1/tickets/create
 *
 * @apiSuccess {boolean} success If the Request was a success
 * @apiSuccess {object} error Error, if occurred
 * @apiSuccess {object} ticket Saved Ticket Object
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
        {
            "error": "Invalid Post Data"
        }
 */

apiTickets.create = async function (req, res) {
  var response = {}
  response.success = true

  var postData = req.body
  if (!_.isObject(postData) || !postData.subject || !postData.issue)
    return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  var socketId = _.isUndefined(postData.socketId) ? '' : postData.socketId

  if (_.isUndefined(postData.tags) || _.isNull(postData.tags)) {
    postData.tags = []
  } else if (!_.isArray(postData.tags)) {
    postData.tags = [postData.tags]
  }

  try {
    var UserSchema = require('../../../models/user')
    var user = await UserSchema.findOne({ _id: req.user._id })

    var TicketStatusSchema = require('../../../models/ticketStatus')
    var status = await TicketStatusSchema.findOne({ order: 0 })

    if (user.deleted) {
      response.success = false
      response.error = 'Invalid User'
      return res.status(400).json(response)
    }

    var HistoryItem = {
      action: 'ticket:created',
      description: 'Ticket was created.',
      owner: req.user._id
    }

    var TicketSchema = require('../../../models/ticket')
    var ticket = new TicketSchema(postData)

    ticket.status = status._id

    if (!_.isUndefined(postData.owner)) {
      ticket.owner = postData.owner
    } else {
      ticket.owner = req.user._id
    }

    ticket.subject = sanitizeHtml(ticket.subject).trim()

    var marked = require('marked')
    var tIssue = ticket.issue
    tIssue = tIssue.replace(/(\r\n|\n\r|\r|\n)/g, '<br>')
    tIssue = sanitizeHtml(tIssue).trim()
    ticket.issue = xss(marked.parse(tIssue))
    ticket.history = [HistoryItem]
    ticket.subscribers = [user._id]

    var t = await ticket.save()
    var tt = await t.populate('group owner priority')

    emitter.emit('ticket:created', {
      hostname: req.headers.host,
      socketId: socketId,
      ticket: tt
    })

    response.ticket = tt
    return res.json(response)
  } catch (err) {
    response.success = false
    response.error = err.error || err.message || err
    var statusCode = err.status || 400
    return res.status(statusCode).json(response)
  }
}

/**
 * @api {post} /api/v1/public/tickets/create Create Public Ticket
 * @apiName createPublicTicket
 * @apiDescription Creates a ticket with the given post data via public ticket submission. [Limited to Server Origin]
 * @apiVersion 0.1.7
 * @apiGroup Ticket
 *
 * @apiParamExample {json} Request-Example:
 * {
 *      "fullname": "Full Name",
 *      "email": "email@email.com",
 *      "subject": "Subject",
 *      "issue": "Issue Exmaple"
 * }
 *
 * @apiExample Example usage:
 * curl -X POST
 *      -H "Content-Type: application/json"
 *      -d "{\"fullname\":\"{fullname}\",\"email\":{email}, \"subject\": \"{subject}\", \"issue\": \"{issue}\"}"
 *      -l http://localhost/api/v1/public/tickets/create
 *
 * @apiSuccess {boolean} success If the Request was a success
 * @apiSuccess {object} error Error, if occurred
 * @apiSuccess {object} ticket Saved Ticket Object
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiTickets.createPublicTicket = async function (req, res) {
  const Chance = require('chance')

  const chance = new Chance()
  const response = {}
  response.success = true
  const postData = req.body
  if (!_.isObject(postData)) {
    return res.status(400).json({ success: false, error: 'Invalid Post Data' })
  }
  let plainTextPass

  const settingSchema = require('../../../models/setting')

  try {
    const allowPublicTickets = await settingSchema.getSetting('allowPublicTickets:enable')
    if (!allowPublicTickets) {
      winston.warn('Public ticket creation attempted while disabled!')
      throw new Error('Public ticket creation is disabled!')
    }

    const roleDefault = await settingSchema.getSetting('role:user:default')
    if (!roleDefault) {
      winston.error('No Default User Role Set. (Settings > Permissions > Default User Role)')
      throw new Error('No Default Role Set')
    }

    const UserSchema = require('../../../models/user')
    plainTextPass = chance.string({
      length: 6,
      pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz1234567890'
    })

    const sanitizedFullname = xss(postData.user.fullname)

    const user = new UserSchema({
      username: postData.user.email,
      password: plainTextPass,
      fullname: sanitizedFullname,
      email: postData.user.email,
      accessToken: chance.hash(),
      role: roleDefault.value
    })

    const savedUser = await user.save()

    // Group Creation
    const GroupSchema = require('../../../models/group')
    const group = new GroupSchema({
      name: savedUser.email,
      members: [savedUser._id],
      sendMailTo: [savedUser._id],
      public: true
    })

    const savedGroup = await group.save()

    const settingsSchema = require('../../../models/setting')
    const defaultType = await settingsSchema.getSettingByName('ticket:type:default')
    if (!defaultType || !defaultType.value) {
      throw new Error('Failed: Invalid Default Ticket Type.')
    }

    const TicketTypeSchema = require('../../../models/tickettype')
    const ticketType = await TicketTypeSchema.getType(defaultType.value)

    const defaultTicketStatus = await settingSchema.getSettingByName('ticket:status:default')
    if (!defaultTicketStatus) {
      throw new Error('Failed: Invalid Default Ticket Status')
    }

    const TicketStatusSchema = require('../../../models/ticketStatus')
    const ticketStatus = await TicketStatusSchema.getStatusById(defaultTicketStatus.value)

    // Create Ticket
    const TicketSchema = require('../../../models/ticket')
    const HistoryItem = {
      action: 'ticket:created',
      description: 'Ticket was created.',
      owner: savedUser._id
    }
    const ticket = new TicketSchema({
      owner: savedUser._id,
      group: savedGroup._id,
      type: ticketType._id,
      status: ticketStatus._id,
      priority: _.first(ticketType.priorities)._id,
      subject: xss(sanitizeHtml(postData.ticket.subject).trim()),
      issue: xss(sanitizeHtml(postData.ticket.issue).trim()),
      history: [HistoryItem],
      subscribers: [savedUser._id]
    })

    const marked = require('marked')
    let tIssue = ticket.issue
    tIssue = tIssue.replace(/(\r\n|\n\r|\r|\n)/g, '<br>')
    tIssue = sanitizeHtml(tIssue).trim()
    ticket.issue = marked.parse(tIssue)
    ticket.issue = xss(ticket.issue)

    const savedTicket = await ticket.save()

    emitter.emit('ticket:created', {
      hostname: req.headers.host,
      socketId: '',
      ticket: savedTicket
    })

    delete savedUser.password
    savedUser.password = undefined

    return res.json({
      success: true,
      userData: { savedUser: savedUser, chancepass: plainTextPass },
      ticket: savedTicket
    })
  } catch (err) {
    winston.debug(err)
    return res.status(400).json({ success: false, error: err.message })
  }
}

/**
 * @api {get} /api/v1/tickets/:uid Get Single Ticket
 * @apiName singleTicket
 * @apiDescription Gets a ticket with the given UID.
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/1000
 *
 * @apiSuccess {boolean} success If the Request was a success
 * @apiSuccess {object} error Error, if occurred
 * @apiSuccess {object} ticket Ticket Object
 *
 * @apiError InvalidRequest The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Ticket"
 }
 */
apiTickets.single = async function (req, res) {
  var uid = req.params.uid
  if (_.isUndefined(uid)) return res.status(200).json({ success: false, error: 'Invalid Ticket' })

  try {
    var ticketModel = require('../../../models/ticket')
    var ticket = await ticketModel.getTicketByUid(uid)

    if (_.isUndefined(ticket) || _.isNull(ticket)) {
      return res.status(200).json({ success: false, error: 'Invalid Ticket' })
    }

    ticket = _.clone(ticket._doc)
    if (!permissions.canThis(req.user.role, 'tickets:notes')) {
      delete ticket.notes
    }

    return res.json({ success: true, ticket: ticket })
  } catch (err) {
    return res.send(err)
  }
}

/**
 * @api {put} /api/v1/tickets/:id Update Ticket
 * @apiName updateTicket
 * @apiDescription Updates ticket via given OID
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json"
 *      -H "accesstoken: {accesstoken}"
 *      -X PUT -d "{\"status\": {status},\"group\": \"{group}\"}"
 *      -l http://localhost/api/v1/tickets/{id}
 *
 * @apiSuccess {boolean} success If the Request was a success
 * @apiSuccess {object} error Error, if occurred
 * @apiSuccess {object} ticket Updated Ticket Object
 *
 * @apiError InvalidRequest The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiTickets.update = async function (req, res) {
  var user = req.user
  if (!_.isUndefined(user) && !_.isNull(user)) {
    var permissions = require('../../../permissions')
    if (!permissions.canThis(user.role, 'tickets:update')) {
      return res.status(401).json({ success: false, error: 'Invalid Permissions' })
    }
    var oId = req.params.id
    var reqTicket = req.body
    if (_.isUndefined(oId)) return res.status(400).json({ success: false, error: 'Invalid Ticket ObjectID.' })

    try {
      var ticketModel = require('../../../models/ticket')
      var ticket = await ticketModel.getTicketById(oId)
      if (!ticket) return res.status(400).json({ success: false, error: 'Unable to locate ticket. Aborting...' })

      if (!_.isUndefined(reqTicket.status)) {
        ticket.status = reqTicket.status
      }

      if (!_.isUndefined(reqTicket.subject)) {
        ticket.subject = sanitizeHtml(reqTicket.subject).trim()
      }

      if (!_.isUndefined(reqTicket.group)) {
        ticket.group = reqTicket.group._id || reqTicket.group
        await ticket.populate('group')
      }

      if (!_.isUndefined(reqTicket.priority)) {
        ticket.priority = reqTicket.priority._id || reqTicket.priority
        await ticket.populate('priority')
      }

      if (!_.isUndefined(reqTicket.closedDate)) {
        ticket.closedDate = reqTicket.closedDate
      }

      if (!_.isUndefined(reqTicket.tags) && !_.isNull(reqTicket.tags)) {
        ticket.tags = reqTicket.tags
      }

      if (!_.isUndefined(reqTicket.issue) && !_.isNull(reqTicket.issue)) {
        ticket.issue = sanitizeHtml(reqTicket.issue).trim()
      }

      if (!_.isUndefined(reqTicket.assignee) && !_.isNull(reqTicket.assignee)) {
        ticket.assignee = reqTicket.assignee
        var t = await ticket.populate('assignee')

        var HistoryItem = {
          action: 'ticket:set:assignee',
          description: t.assignee.fullname + ' was set as assignee',
          owner: req.user._id
        }

        ticket.history.push(HistoryItem)
      }

      var savedTicket = await ticket.save()

      if (!permissions.canThis(user.role, 'tickets:notes')) {
        savedTicket.notes = []
      }

      return res.json({
        success: true,
        error: null,
        ticket: savedTicket
      })
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message })
    }
  } else {
    return res.status(403).json({ success: false, error: 'Invalid Access Token' })
  }
}

/**
 * @api {put} /api/v1/tickets/:id/assignee Set Ticket Assignee
 * @apiName setTicketAssignee
 * @apiDescription Sets the assignee for a ticket
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 */
apiTickets.setAssignee = async function (req, res) {
  var user = req.user
  if (_.isUndefined(user) || _.isNull(user)) return res.status(401).json({ success: false, error: 'Invalid Access Token' })

  var oId = req.params.id
  var assigneeId = req.body.assignee

  if (_.isUndefined(oId)) return res.status(400).json({ success: false, error: 'Invalid Ticket ObjectID.' })
  if (_.isUndefined(assigneeId) || _.isNull(assigneeId) || assigneeId === '')
    return res.status(400).json({ success: false, error: 'Invalid Assignee Id' })

  try {
    var ticketModel = require('../../../models/ticket')
    var ticket = await ticketModel.getTicketById(oId)
    if (!ticket) return res.status(400).json({ success: false, error: 'Unable to locate ticket. Aborting...' })

    await ticket.setAssignee(user._id, assigneeId)
    var t = await ticket.save()

    if (!permissions.canThis(user.role, 'tickets:notes')) {
      t.notes = []
    }

    return res.json({ success: true, error: null, ticket: t })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || err })
  }
}

/**
 * @api {delete} /api/v1/tickets/:id/assignee Clear Ticket Assignee
 * @apiName clearTicketAssignee
 * @apiDescription Clears the assignee for a ticket
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 */
apiTickets.clearAssignee = async function (req, res) {
  var user = req.user
  if (_.isUndefined(user) || _.isNull(user)) return res.status(401).json({ success: false, error: 'Invalid Access Token' })

  var oId = req.params.id
  if (_.isUndefined(oId)) return res.status(400).json({ success: false, error: 'Invalid Ticket ObjectID.' })

  try {
    var ticketModel = require('../../../models/ticket')
    var ticket = await ticketModel.getTicketById(oId)
    if (!ticket) return res.status(400).json({ success: false, error: 'Unable to locate ticket. Aborting...' })

    await ticket.clearAssignee(user._id)
    var t = await ticket.save()

    if (!permissions.canThis(user.role, 'tickets:notes')) {
      t.notes = []
    }

    return res.json({ success: true, error: null, ticket: t })
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || err })
  }
}

/**
 * @api {delete} /api/v1/tickets/:id Delete Ticket
 * @apiName deleteTicket
 * @apiDescription Deletes ticket via given OID
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -X DELETE -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/{id}
 *
 * @apiSuccess {boolean} success If the Request was a success
 * @apiSuccess {object} error Error, if occurred
 *
 * @apiError InvalidRequest The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiTickets.delete = async function (req, res) {
  var oId = req.params.id
  var user = req.user

  if (_.isUndefined(oId) || _.isUndefined(user))
    return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    var ticketModel = require('../../../models/ticket')
    await ticketModel.softDelete(oId)
    emitter.emit('ticket:deleted', oId)
    res.json({ success: true, error: null })
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Invalid Post Data' })
  }
}

/**
 * @api {post} /api/v1/tickets/addcomment Add Comment
 * @apiName addComment
 * @apiDescription Adds comment to the given Ticket Id
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -X POST
 *      -H "Content-Type: application/json"
 *      -H "accesstoken: {accesstoken}"
 *      -d "{\"comment\":\"{comment}\",\"owner\":{ownerId}, ticketId: \"{ticketId}\"}"
 *      -l http://localhost/api/v1/tickets/addcomment
 *
 * @apiParamExample {json} Request:
 * {
 *      "comment": "Comment Text",
 *      "owner": {OwnerId},
 *      "ticketid": {TicketId}
 * }
 *
 * @apiSuccess {boolean} success Successful
 * @apiSuccess {string} error Error if occurrred
 * @apiSuccess {object} ticket Ticket Object
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiTickets.postComment = async function (req, res) {
  var commentJson = req.body
  var comment = commentJson.comment
  var owner = commentJson.ownerId || req.user._id
  var ticketId = commentJson._id

  if (_.isUndefined(ticketId)) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    var ticketModel = require('../../../models/ticket')
    var t = await ticketModel.getTicketById(ticketId)

    if (_.isUndefined(comment)) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

    var marked = require('marked')
    marked.setOptions({
      breaks: true
    })

    comment = sanitizeHtml(comment).trim()

    var Comment = {
      owner: owner,
      date: new Date(),
      comment: xss(marked.parse(comment))
    }

    t.updated = Date.now()
    t.comments.push(Comment)
    var HistoryItem = {
      action: 'ticket:comment:added',
      description: 'Comment was added',
      owner: owner
    }
    t.history.push(HistoryItem)

    var tt = await t.save()

    if (!permissions.canThis(req.user.role, 'tickets:notes')) {
      tt.notes = []
    }

    emitter.emit('ticket:comment:added', tt, Comment, req.headers.host)

    return res.json({ success: true, error: null, ticket: tt })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

/**
 * @api {post} /api/v1/tickets/addnote Add Note
 * @apiName addInternalNote
 * @apiDescription Adds a note to the given Ticket Id
 * @apiVersion 0.1.10
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -X POST
 *      -H "Content-Type: application/json"
 *      -H "accesstoken: {accesstoken}"
 *      -d "{\"note\":\"{note}\",\"owner\":{ownerId}, ticketId: \"{ticketId}\"}"
 *      -l http://localhost/api/v1/tickets/addnote
 *
 * @apiParamExample {json} Request:
 * {
 *      "note": "Note Text",
 *      "owner": {OwnerId},
 *      "ticketid": {TicketId}
 * }
 *
 * @apiSuccess {boolean} success Successful
 * @apiSuccess {string} error Error if occurrred
 * @apiSuccess {object} ticket Ticket Object
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiTickets.postInternalNote = async function (req, res) {
  var payload = req.body
  if (_.isUndefined(payload.ticketid)) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    var ticketModel = require('../../../models/ticket')
    var ticket = await ticketModel.getTicketById(payload.ticketid)

    if (_.isUndefined(payload.note)) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

    var marked = require('marked')
    var Note = {
      owner: payload.owner || req.user._id,
      date: new Date(),
      note: xss(marked.parse(payload.note))
    }

    ticket.updated = Date.now()
    ticket.notes.push(Note)
    var HistoryItem = {
      action: 'ticket:note:added',
      description: 'Internal note was added',
      owner: payload.owner || req.user._id
    }
    ticket.history.push(HistoryItem)

    var savedTicket = await ticket.save()

    try {
      savedTicket = await ticketModel.populate(savedTicket, 'subscribers notes.owner history.owner')
    } catch (popErr) {
      // If populate fails, still return the ticket
    }

    emitter.emit('ticket:note:added', savedTicket, Note)

    return res.json({ success: true, ticket: savedTicket })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

/**
 * @api {get} /api/v1/tickets/types Get Ticket Types
 * @apiName getTicketTypes
 * @apiDescription Gets all available ticket types.
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/types
 *
 * @apiError InvalidRequest Invalid Post Data
 *
 */
apiTickets.getTypes = async function (req, res) {
  try {
    var ticketType = require('../../../models/tickettype')
    var types = await ticketType.getTypes()
    return res.json(types)
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Invalid Post Data' })
  }
}

apiTickets.getType = async function (req, res) {
  var id = req.params.id
  if (!id) return res.status(400).json({ success: false, error: 'Invalid Type ID' })

  try {
    var ticketType = require('../../../models/tickettype')
    var type = await ticketType.getType(id)
    return res.json({ success: true, type: type })
  } catch (err) {
    return res.status(400).json({ success: false, error: 'Invalid Type ID' })
  }
}

/**
 * @api {post} /api/v1/tickets/types/create Create Ticket Type
 * @apiName createType
 * @apiDescription Creates a new ticket type
 * @apiVersion 0.1.10
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -X POST
 *      -H "accesstoken: {accesstoken}"
 *      -d "{\"name\": \"TypeName\"}"
 *      -l http://localhost/api/v1/tickets/types/create
 *
 * @apiSuccess {boolean} success Successfully?
 * @apiSuccess {Object} tickettype Returns the newly create ticket type
 *
 */
apiTickets.createType = async function (req, res) {
  var typeName = req.body.name
  var ticketTypeSchema = require('../../../models/tickettype')
  var ticketPrioritiesSchema = require('../../../models/ticketpriority')

  if (_.isUndefined(typeName) || typeName.length < 3)
    return res.status(400).json({ success: false, error: 'Invalid Type Name!' })

  try {
    var priorities = await ticketPrioritiesSchema.find({ default: true })
    priorities = _.sortBy(priorities, 'migrationNum')

    var ticketType = await ticketTypeSchema.create({ name: typeName, priorities: priorities })
    return res.json({ success: true, tickettype: ticketType })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

/**
 * @api {put} /api/v1/tickets/types/:id Update Ticket Type
 * @apiName updateType
 * @apiDescription Updates given ticket type
 * @apiVersion 0.1.10
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -X PUT -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/types/:id
 *
 * @apiSuccess {boolean} success Successfully?
 * @apiSuccess {object} tag Updated Ticket Type
 *
 */
apiTickets.updateType = async function (req, res) {
  var id = req.params.id

  var data = req.body

  var ticketTypeSchema = require('../../../models/tickettype')

  if (_.isUndefined(id) || _.isNull(id) || _.isNull(data) || _.isUndefined(data)) {
    return res.status(400).json({ success: false, error: 'Invalid Put Data' })
  }

  try {
    var type = await ticketTypeSchema.getType(id)
    type.name = data.name
    var t = await type.save()
    return res.json({ success: true, type: t })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.typeAddPriority = async function (req, res) {
  var id = req.params.id

  var data = req.body

  var ticketTypeSchema = require('../../../models/tickettype')

  if (!id || !data || !data.priority) {
    return res.status(400).json({ success: false, error: 'Invalid request data' })
  }

  try {
    var type = await ticketTypeSchema.getType(id)
    type = await type.addPriority(data.priority)
    var t = await type.save()
    var tt = await t.populate('priorities')
    return res.json({ success: true, type: tt })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.typeRemovePriority = async function (req, res) {
  var id = req.params.id

  var data = req.body

  var ticketTypeSchema = require('../../../models/tickettype')

  if (!id || !data || !data.priority) {
    return res.status(400).json({ success: false, error: 'Invalid request data' })
  }

  try {
    var type = await ticketTypeSchema.getType(id)
    type = await type.removePriority(data.priority)
    var t = await type.save()
    var tt = await t.populate('priorities')
    return res.json({ success: true, type: tt })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

/**
 * @api {delete} /api/v1/tickets/types/:id Delete Ticket Type
 * @apiName deleteType
 * @apiDescription Deletes given ticket type
 * @apiVersion 0.1.10
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -X DELETE
 *      -H "accesstoken: {accesstoken}"
 *      -d "{\"newTypeId\": \"{ObjectId}\"}"
 *      -l http://localhost/api/v1/tickets/types/:id
 *
 * @apiSuccess {boolean} success Successfully?
 * @apiSuccess {number} updated Count of Tickets updated to new type
 *
 */
apiTickets.deleteType = async function (req, res) {
  var newTypeId = req.body.newTypeId
  var delTypeId = req.params.id

  if (_.isUndefined(newTypeId) || _.isUndefined(delTypeId)) {
    return res.status(400).json({ success: false, error: 'Invalid POST data.' })
  }

  var ticketTypeSchema = require('../../../models/tickettype')
  var ticketSchema = require('../../../models/ticket')
  var settingsSchema = require('../../../models/setting')

  try {
    var setting = await settingsSchema.getSettingByName('mailer:check:ticketype')
    if (setting && setting.value.toString().toLowerCase() === delTypeId.toString().toLowerCase()) {
      throw {
        custom: true,
        message: 'Type currently "Default Ticket Type" for mailer check.'
      }
    }

    var result = await ticketSchema.updateType(delTypeId, newTypeId)

    var type = await ticketTypeSchema.getType(delTypeId)
    await type.deleteOne()

    return res.json({ success: true, updated: result.nModified })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

apiTickets.createPriority = async function (req, res) {
  var data = req.body

  var pName = data.name
  var pOverdueIn = data.overdueIn
  var pHtmlColor = data.htmlColor

  if (!pName) {
    return res.status(400).json({ success: false, error: 'Invalid Request Data.' })
  }

  try {
    var TicketPrioritySchema = require('../../../models/ticketpriority')

    var P = new TicketPrioritySchema({
      name: pName,
      overdueIn: pOverdueIn,
      htmlColor: pHtmlColor
    })

    var savedPriority = await P.save()
    return res.json({ success: true, priority: savedPriority })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.getPriorities = async function (req, res) {
  try {
    var ticketPrioritySchema = require('../../../models/ticketpriority')
    var priorities = await ticketPrioritySchema.find({})
    priorities = _.sortBy(priorities, ['migrationNum', 'name'])
    return res.json({ success: true, priorities: priorities })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.updatePriority = async function (req, res) {
  var id = req.params.id

  var data = req.body

  if (_.isUndefined(id) || _.isNull(id) || _.isNull(data) || _.isUndefined(data)) {
    return res.status(400).json({ success: false, error: 'Invalid Request Data' })
  }

  try {
    var ticketPrioritySchema = require('../../../models/ticketpriority')
    var priority = await ticketPrioritySchema.findOne({ _id: id })

    if (data.name) {
      priority.name = data.name
    }
    if (data.htmlColor) {
      priority.htmlColor = data.htmlColor
    }
    if (data.overdueIn) {
      priority.overdueIn = data.overdueIn
    }

    var p = await priority.save()
    return res.json({ success: true, priority: p })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.createStatus = async function (req, res) {
  var data = req.body

  var pName = data.name
  var pHtmlColor = data.htmlColor

  if (!pName) {
    return res.status(400).json({ success: false, error: 'Invalid Request Data.' })
  }

  try {
    var TicketStatusSchema = require('../../../models/ticketStatus')

    var P = new TicketStatusSchema({
      name: pName,
      htmlColor: pHtmlColor
    })

    var savedPriority = await P.save()
    return res.json({ success: true, priority: savedPriority })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.getStatus = async function (req, res) {
  try {
    var ticketStatusSchema = require('../../../models/ticketStatus')
    var status = await ticketStatusSchema.find({})
    status = _.sortBy(status, 'order')
    return res.json({ success: true, status: status })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.updateStatus = async function (req, res) {
  var id = req.params.id
  var data = req.body

  if (_.isUndefined(id) || _.isNull(id) || _.isNull(data) || _.isUndefined(data)) {
    return res.status(400).json({ success: false, error: 'Invalid Request Data' })
  }

  try {
    var ticketStatusSchema = require('../../../models/ticketStatus')
    var status = await ticketStatusSchema.findOne({ _id: id })

    if (data.name) status.name = data.name
    if (data.htmlColor) status.htmlColor = data.htmlColor
    status.isResolved = data.isResolved
    status.slatimer = data.slatimer

    var p = await status.save()
    return res.json({ success: true, status: p })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.updateStatusOrder = async function (req, res) {
  var data = req.body
  if (!data || !data.order) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  var order = data.order

  try {
    var ticketStatusSchema = require('../../../models/ticketStatus')
    var statuses = await ticketStatusSchema.find({})

    for (var item of statuses) {
      var idx = _.findIndex(order, id => item._id.toString() === id)
      item.order = idx
      await item.save()
    }

    return res.status(200).json({ success: true })
  } catch (err) {
    winston.debug(err)
    return res.status(500).json({ success: false, error: err })
  }
}

apiTickets.deleteStatus = async function (req, res) {
  var id = req.params.id
  var newStatusId = req.body.newStatusId
  if (!id || !newStatusId) {
    return res.status(400).json({ success: false, error: 'Invalid Request Data' })
  }

  try {
    var ticketSchema = require('../../../models/ticket')
    await ticketSchema.updateMany({ status: id }, { status: newStatusId })

    var ticketStatusSchema = require('../../../models/ticketStatus')
    var status = await ticketStatusSchema.findOne({ _id: id })
    if (status.isLocked) throw new Error(`Unable to delete default status: ${status.name}`)

    await status.deleteOne()

    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.deletePriority = async function (req, res) {
  var id = req.params.id

  var newPriority = req.body.newPriority

  if (!id || !newPriority) {
    return res.status(400).json({ success: false, error: 'Invalid Request Data' })
  }

  try {
    var ticketSchema = require('../../../models/ticket')
    await ticketSchema.updateMany({ priority: id }, { priority: newPriority })

    var ticketPrioritySchema = require('../../../models/ticketpriority')
    var priority = await ticketPrioritySchema.findOne({ _id: id })

    if (priority.default) {
      throw new Error('Unable to delete default priority: ' + priority.name)
    }

    await priority.deleteOne()

    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

/**
 * @api {get} /api/v1/tickets/stats Get Ticket Stats
 * @apiName getTicketStats
 * @apiDescription Gets cached ticket stats
 * @apiVersion 0.1.7
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/stats
 *
 * @apiError InvalidRequest Invalid Post Data
 *
 */
apiTickets.getTicketStats = async function (req, res) {
  var timespan = 30
  if (req.params.timespan) {
    timespan = parseInt(req.params.timespan)
  }

  var cache = global.cache

  if (_.isUndefined(cache)) {
    return res.status(400).send('Ticket stats are still loading...')
  }

  var obj = {}

  switch (timespan) {
    case 30:
      obj.data = cache.get('tickets:overview:e30:graphData')
      obj.ticketCount = cache.get('tickets:overview:e30:ticketCount')
      obj.closedCount = cache.get('tickets:overview:e30:closedTickets')
      obj.ticketAvg = cache.get('tickets:overview:e30:responseTime')
      break
    case 60:
      obj.data = cache.get('tickets:overview:e60:graphData')
      obj.ticketCount = cache.get('tickets:overview:e60:ticketCount')
      obj.closedCount = cache.get('tickets:overview:e60:closedTickets')
      obj.ticketAvg = cache.get('tickets:overview:e60:responseTime')
      break
    case 90:
      obj.data = cache.get('tickets:overview:e90:graphData')
      obj.ticketCount = cache.get('tickets:overview:e90:ticketCount')
      obj.closedCount = cache.get('tickets:overview:e90:closedTickets')
      obj.ticketAvg = cache.get('tickets:overview:e90:responseTime')
      break
    case 180:
      obj.data = cache.get('tickets:overview:e180:graphData')
      obj.ticketCount = cache.get('tickets:overview:e180:ticketCount')
      obj.closedCount = cache.get('tickets:overview:e180:closedTickets')
      obj.ticketAvg = cache.get('tickets:overview:e180:responseTime')
      break
    case 365:
      obj.data = cache.get('tickets:overview:e365:graphData')
      obj.ticketCount = cache.get('tickets:overview:e365:ticketCount')
      obj.closedCount = cache.get('tickets:overview:e365:closedTickets')
      obj.ticketAvg = cache.get('tickets:overview:e365:responseTime')
      break
  }

  obj.mostRequester = cache.get('quickstats:mostRequester')
  obj.mostCommenter = cache.get('quickstats:mostCommenter')
  obj.mostAssignee = cache.get('quickstats:mostAssignee')
  obj.mostActiveTicket = cache.get('quickstats:mostActiveTicket')

  obj.lastUpdated = cache.get('tickets:overview:lastUpdated')

  try {
    var settingsUtil = require('../../../settings/settingsUtil')
    var context = await settingsUtil.getSettings()
    var tz = context.data.settings.timezone.value
    obj.lastUpdated = moment
      .utc(obj.lastUpdated)
      .tz(tz)
      .format('MM-DD-YYYY hh:mm:ssa')
  } catch (err) {
    // If settings fail, just return without timezone conversion
  }

  return res.send(obj)
}

function parseTicketStats (role, tickets, callback) {
  if (_.isEmpty(tickets)) return callback({ tickets: tickets, tags: {} })
  var t = []
  var tags = {}
  if (!permissions.canThis(role, 'tickets:notes')) {
    _.each(tickets, function (ticket) {
      ticket.notes = []
    })
  }

  _.each(tickets, function (ticket) {
    _.each(ticket.tags, function (tag) {
      t.push(tag.name)
    })

    t = _.take(t, 10)
  })

  _.mixin({
    sortKeysBy: function (obj, comparator) {
      var keys = _.sortBy(_.keys(obj), function (key) {
        return comparator ? comparator(obj[key], key) : key
      })

      return _.zipObject(
        keys,
        _.map(keys, function (key) {
          return obj[key]
        })
      )
    }
  })

  tags = _.countBy(t, function (k) {
    return k
  })
  tags = _(tags)
    .toPairs()
    .sortBy(0)
    .fromPairs()
    .value()

  return callback({ tickets: tickets, tags: tags })
}

/**
 * @api {get} /api/v1/tickets/stats/group/:group Get Ticket Stats For Group
 * @apiName getTicketStatsForGroup
 * @apiDescription Gets live ticket stats for given groupId
 * @apiVersion 0.1.7
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/stats/group/{groupid}
 *
 * @apiError InvalidRequest Invalid Post Data
 *
 */
apiTickets.getTicketStatsForGroup = async function (req, res) {
  var groupId = req.params.group
  if (groupId === 0) return res.status(200).json({ success: false, error: 'Please Select Group.' })
  if (_.isUndefined(groupId)) return res.status(400).json({ success: false, error: 'Invalid Group Id.' })

  try {
    var ticketModel = require('../../../models/ticket')
    var data = {}
    var tags = {}

    var obj = { limit: 10000, page: 0 }
    var tickets = await ticketModel.getTicketsWithObject([groupId], obj)

    parseTicketStats(req.user.role, tickets, function (d) {
      tags = d.tags
    })

    if (_.isEmpty(tickets)) throw new Error('Group has no tickets to report.')

    var today = moment()
      .hour(23)
      .minute(59)
      .second(59)
    var r = {}
    r.ticketCount = _.size(tickets)
    tickets = _.sortBy(tickets, 'date')
    r.recentTickets = _.takeRight(tickets, 5)
    r.closedTickets = _.filter(tickets, function (v) {
      return v.status === 3
    })

    var firstDate = moment(_.first(tickets).date).subtract(30, 'd')
    var diffDays = today.diff(firstDate, 'days')

    r.graphData = buildGraphData(tickets, diffDays)

    var avgObj = buildAvgResponse(tickets)
    if (!_.isUndefined(avgObj)) {
      r.avgResponse = avgObj.avgResponse
    }

    data.ticketCount = r.ticketCount
    data.recentTickets = r.recentTickets
    data.closedCount = _.size(r.closedTickets)
    data.graphData = r.graphData
    data.avgResponse = r.avgResponse
    data.tags = tags

    return res.json({ success: true, data: data })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || err })
  }
}

/**
 * @api {get} /api/v1/tickets/stats/user/:user Get Ticket Stats For User
 * @apiName getTicketStatsForUser
 * @apiDescription Gets live ticket stats for given userId
 * @apiVersion 0.1.9
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/stats/user/{userid}
 *
 * @apiError InvalidRequest Invalid Post Data
 *
 */
apiTickets.getTicketStatsForUser = async function (req, res) {
  var userId = req.params.user
  if (userId === 0) return res.status(200).json({ success: false, error: 'Please Select User.' })
  if (_.isUndefined(userId)) return res.status(400).json({ success: false, error: 'Invalid User Id.' })

  try {
    var ticketModel = require('../../../models/ticket')
    var data = {}
    var tags = {}

    var tickets = await ticketModel.getTicketsByRequester(userId)

    parseTicketStats(req.user.role, tickets, function (d) {
      tags = d.tags
    })

    if (_.isEmpty(tickets)) throw new Error('User has no tickets to report.')

    var today = moment()
      .hour(23)
      .minute(59)
      .second(59)
    var r = {}
    r.ticketCount = _.size(tickets)
    tickets = _.sortBy(tickets, 'date')
    r.recentTickets = _.takeRight(tickets, 5)
    r.closedTickets = _.filter(tickets, function (v) {
      return v.status === 3
    })

    var firstDate = moment(_.first(tickets).date).subtract(30, 'd')
    var diffDays = today.diff(firstDate, 'days')

    r.graphData = buildGraphData(tickets, diffDays)

    var avgObj = buildAvgResponse(tickets)
    if (!_.isUndefined(avgObj)) {
      r.avgResponse = avgObj.avgResponse
    }

    data.ticketCount = r.ticketCount
    data.recentTickets = r.recentTickets
    data.closedCount = _.size(r.closedTickets)
    data.graphData = r.graphData
    data.avgResponse = r.avgResponse
    data.tags = tags

    return res.json({ success: true, data: data })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message || err })
  }
}

/**
 * @api {get} /api/v1/tickets/count/tags Get Tags Count
 * @apiName getTagCount
 * @apiDescription Gets cached count of all tags
 * @apiVersion 0.1.7
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/count/tags
 *
 * @apiError InvalidRequest Invalid Post Data
 *
 */
apiTickets.getTagCount = function (req, res) {
  const cache = global.cache
  let timespan = req.params.timespan
  if (_.isUndefined(timespan) || _.isNaN(timespan)) timespan = 0

  if (_.isUndefined(cache)) {
    return res.status(400).send('Tag stats are still loading...')
  }

  const tags = cache.get('tags:' + timespan + ':usage')

  res.json({ success: true, tags })
}

/**
 * @api {get} /api/v1/tickets/count/topgroups/:timespan/:topNum Top Groups Count
 * @apiName getTopTicketGroups
 * @apiDescription Gets the group with the top ticket count and timespan
 * @apiVersion 0.1.7
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/count/topgroups/30/10
 *
 * @apiSuccess {array} items Array with Group name and Count
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Request"
 }
 */
apiTickets.getTopTicketGroups = async function (req, res) {
  try {
    var ticketModel = require('../../../models/ticket')
    var top = req.params.top
    var timespan = req.params.timespan

    var items = await ticketModel.getTopTicketGroups(timespan, top)
    return res.json({ items: items })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid Request' })
  }
}

/**
 * @api {delete} /api/v1/tickets/:tid/attachments/remove/:aid Remove Attachment
 * @apiName removeAttachment
 * @apiDescription Remove Attachemtn with given Attachment ID from given Ticket ID
 * @apiVersion 0.1.0
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -X DELETE -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/:tid/attachments/remove/:aid
 *
 * @apiSuccess {boolean} success Successfully?
 * @apiSuccess {object} ticket Ticket Object
 *
 * @apiError InvalidRequest Invalid Request
 * @apiError InvalidPermissions Invalid Permissions
 */
apiTickets.removeAttachment = async function (req, res) {
  var ticketId = req.params.tid
  var attachmentId = req.params.aid
  if (_.isUndefined(ticketId) || _.isUndefined(attachmentId))
    return res.status(400).json({ error: 'Invalid Attachment' })

  // Check user perm
  var user = req.user
  if (_.isUndefined(user)) return res.status(400).json({ error: 'Invalid User Auth.' })

  var permissions = require('../../../permissions')
  if (!permissions.canThis(user.role, 'tickets:removeAttachment'))
    return res.status(401).json({ error: 'Invalid Permissions' })

  try {
    var ticketModel = require('../../../models/ticket')
    var ticket = await ticketModel.getTicketById(ticketId)

    var a = await ticket.getAttachment(attachmentId)
    ticket = await ticket.removeAttachment(user._id, attachmentId)

    var fs = require('fs')
    var path = require('path')
    var dir = path.join(__dirname, '../../../../public', a.path)
    if (fs.existsSync(dir)) fs.unlinkSync(dir)

    var t = await ticket.save()
    res.json({ success: true, ticket: t })
  } catch (err) {
    return res.status(400).json({ error: 'Invalid Request.' })
  }
}

/**
 * @api {put} /api/v1/tickets/:id/subscribe Subscribe/Unsubscribe
 * @apiName subscribeTicket
 * @apiDescription Subscribe/Unsubscribe user to the given ticket OID
 * @apiVersion 0.1.4
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -H "accesstoken: {accesstoken}" -X PUT -d "{\"user\": {user},\"subscribe\": {boolean}}" -l http://localhost/api/v1/tickets/{id}
 *
 * @apiParamExample {json} Request-Example:
   {
       "user": {user},
       "subscribe": {boolean}
   }
 *
 * @apiSuccess {boolean} success Successfully?
 *
 * @apiError InvalidPostData Invalid Post Data
 */
apiTickets.subscribe = async function (req, res) {
  var ticketId = req.params.id
  var data = req.body
  if (_.isUndefined(data.user) || _.isUndefined(data.subscribe))
    return res.status(400).json({ error: 'Invalid Post Data.' })

  if (data.user.toString() !== req.user._id.toString()) return res.status(401).json({ error: 'Unauthorized!' })

  try {
    var ticketModel = require('../../../models/ticket')
    var ticket = await ticketModel.getTicketById(ticketId)

    var userFound = await require('../../../models/user').find({ _id: data.user })
    if (!userFound) throw new Error('Unauthorized!')

    if (data.subscribe) {
      await ticket.addSubscriber(data.user)
    } else {
      await ticket.removeSubscriber(data.user)
    }

    var savedTicket = await ticket.save()
    emitter.emit('ticket:subscriber:update', savedTicket)
    res.json({ success: true, ticket: savedTicket })
  } catch (err) {
    winston.warn(err)
    return res.status(401).json({ error: 'Unauthorized!' })
  }
}

/**
 * @api {get} /api/v1/tickets/tags Get Ticket Tags
 * @apiName getTags
 * @apiDescription Gets all ticket tags
 * @apiVersion 0.1.6
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged-in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/tags
 *
 * @apiSuccess {boolean} success Successfully?
 * @apiSuccess {boolean} tags Array of Tags
 *
 */
apiTickets.getTags = async function (req, res) {
  try {
    var tagSchema = require('../../../models/tag')
    var tags = await tagSchema.getTags()

    _.each(tags, function (item) {
      item.__v = undefined
    })

    res.json({ success: true, tags: tags })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

/**
 * @api {get} /api/v1/tickets/overdue Get Overdue Tickets
 * @apiName getOverdue
 * @apiDescription Gets current overdue tickets
 * @apiVersion 0.1.9
 * @apiGroup Ticket
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tickets/overdue
 *
 * @apiSuccess {boolean} success Successfully?
 *
 */
apiTickets.getOverdue = async function (req, res) {
  try {
    var settingSchema = require('../../../models/setting')
    var setting = await settingSchema.getSettingByName('showOverdueTickets:enable')

    if (setting !== null && setting.value === false) {
      return res.json({
        success: true,
        error: 'Show Overdue currently disabled.'
      })
    }

    var ticketSchema = require('../../../models/ticket')
    var departmentSchema = require('../../../models/department')
    var groupSchema = require('../../../models/group')

    var groups
    if (!req.user.role.isAdmin && !req.user.role.isAgent) {
      groups = await groupSchema.getAllGroupsOfUserNoPopulate(req.user._id)
    } else {
      groups = await departmentSchema.getDepartmentGroupsOfUser(req.user._id)
    }

    var groupIds = groups.map(function (g) {
      return g._id
    })

    var tickets = await ticketSchema.getOverdue(groupIds)
    var sorted = _.sortBy(tickets, 'uid').reverse()

    return res.json({ success: true, tickets: sorted })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiTickets.getDeletedTickets = async function (req, res) {
  try {
    var ticketSchema = require('../../../models/ticket')
    var tickets = await ticketSchema.getDeleted()
    return res.json({ success: true, count: tickets.length, deletedTickets: tickets })
  } catch (err) {
    return res.status(500).json({ success: false, error: err })
  }
}

apiTickets.restoreDeleted = async function (req, res) {
  var postData = req.body
  if (!postData || !postData._id) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    var ticketSchema = require('../../../models/ticket')
    await ticketSchema.restoreDeleted(postData._id)
    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err })
  }
}

module.exports = apiTickets
