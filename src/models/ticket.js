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
const winston = require('../logger')
const _ = require('lodash')
const moment = require('moment')
const sanitizeHtml = require('sanitize-html')
// const redisCache          = require('../cache/rediscache');
const xss = require('xss')
const utils = require('../helpers/utils')

// Needed - For Population
const groupSchema = require('./group')
const userSchema = require('./user')
const commentSchema = require('./comment')
const noteSchema = require('./note')
const attachmentSchema = require('./attachment')
const historySchema = require('./history')
const statusSchema = require('./ticketStatus')
require('./tag')
require('./ticketpriority')
require('./tickettype')

const COLLECTION = 'tickets'

/**
 * Ticket Schema
 * @module models/ticket
 * @class Ticket
 * @requires {@link Group}
 * @requires {@link TicketType}
 * @requires {@link User}
 * @requires {@link Comment}
 * @requires {@link Attachment}
 * @requires {@link History}
 *
 * @property {object} _id ```Required``` ```unique``` MongoDB Object ID
 * @property {Number} uid ```Required``` ```unique``` Readable Ticket ID
 * @property {User} owner ```Required``` Reference to User Object. Owner of this Object.
 * @property {Group} group ```Required``` Group this Ticket is under.
 * @property {User} assignee User currently assigned to this Ticket.
 * @property {Date} date ```Required``` [default: Date.now] Date Ticket was created.
 * @property {Date} updated Date ticket was last updated
 * @property {Boolean} deleted ```Required``` [default: false] If they ticket is flagged as deleted.
 * @property {TicketType} type ```Required``` Reference to the TicketType
 * @property {Number} status ```Required``` [default: 0] Ticket Status. (See {@link Ticket#setStatus})
 * @property {Number} priority ```Required```
 * @property {Array} tags An array of Tags.
 * @property {String} subject ```Required``` The subject of the ticket. (Overview)
 * @property {String} issue ```Required``` Detailed information about the ticket problem/task
 * @property {Date} closedDate show the datetime the ticket was moved to status 3.
 * @property {Array} comments An array of {@link Comment} items
 * @property {Array} notes An array of {@link Comment} items for internal notes
 * @property {Array} attachments An Array of {@link Attachment} items
 * @property {Array} history An array of {@link History} items
 * @property {Array} subscribers An array of user _ids that receive notifications on ticket changes.
 */
const ticketSchema = mongoose.Schema({
  uid: { type: Number, unique: true, index: true },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'accounts'
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'groups'
  },
  assignee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'accounts'
  },
  date: { type: Date, default: Date.now, required: true, index: true },
  updated: { type: Date },
  deleted: { type: Boolean, default: false, required: true, index: true },
  type: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'tickettypes'
  },
  status: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'statuses',
    index: true
  },

  priority: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'priorities',
    required: true
  },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'tags', autopopulate: true }],
  subject: { type: String, required: true },
  issue: { type: String, required: true },
  closedDate: { type: Date },
  dueDate: { type: Date },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  comments: [commentSchema],
  notes: [noteSchema],
  attachments: [attachmentSchema],
  history: [historySchema],
  checklist: [{
    title: { type: String, required: true },
    completed: { type: Boolean, default: false },
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts' },
    completedAt: { type: Date }
  }],
  subscribers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'accounts' }]
})

ticketSchema.index({ deleted: -1, group: 1, status: 1 })

const autoPopulate = function () {
  this.populate('priority')
}

ticketSchema.pre('findOne', autoPopulate).pre('find', autoPopulate)

ticketSchema.pre('save', async function () {
  this.subject = utils.sanitizeFieldPlainText(this.subject.trim())
  this.wasNew = this.isNew

  if (!_.isUndefined(this.uid) || this.uid) {
    return
  }

  const c = require('./counters')
  const res = await c.increment('tickets')

  this.uid = res.next

  if (_.isUndefined(this.uid)) {
    throw new Error('Invalid UID.')
  }
})

ticketSchema.post('save', async function (doc) {
  if (!this.wasNew) {
    const emitter = require('../emitter')
    try {
      const savedTicket = await doc.populate([
        {
          path: 'owner assignee comments.owner notes.owner subscribers history.owner',
          select: '_id username fullname email role image title'
        },
        { path: 'type tags' },
        {
          path: 'group',
          model: groupSchema,
          populate: [
            {
              path: 'members',
              model: userSchema,
              select: '-__v -accessToken -tOTPKey'
            },
            {
              path: 'sendMailTo',
              model: userSchema,
              select: '-__v -accessToken -tOTPKey'
            }
          ]
        }
      ])

      emitter.emit('ticket:updated', savedTicket)
    } catch (err) {
      winston.warn('WARNING: ' + err)
    }
  }
})

ticketSchema.virtual('statusFormatted').get(function () {
  // This virtual previously relied on callback-style queries which are not supported.
  // It returns the status ObjectId. Use populate('status') to get the name.
  return this.status
})

ticketSchema.virtual('commentsAndNotes').get(function () {
  _.each(this.comments, function (i) {
    i.isComment = true
  })
  _.each(this.notes, function (i) {
    i.isNote = true
  })
  let combined = _.union(this.comments, this.notes)
  combined = _.sortBy(combined, 'date')

  return combined
})

/**
 * Set Status on Instanced Ticket
 * @instance
 * @method setStatus
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {string} status Status to set
 *
 * @example
 * Status:
 *      0 - New
 *      1 - Open
 *      2 - Pending
 *      3 - Closed
 */
ticketSchema.methods.setStatus = async function (ownerId, status) {
  if (_.isUndefined(status)) {
    throw new Error('Invalid Status')
  }

  const statusSchemaModel = require('./ticketStatus')
  const statusModel = await statusSchemaModel.getStatusById(status)

  if (!statusModel) {
    throw new Error('Invalid Status')
  }

  this.closedDate = statusModel.isResolved ? new Date() : null
  this.status = status

  const historyItem = {
    action: 'ticket:set:status:' + statusModel.name,
    description: 'Ticket Status set to: ' + statusModel.name,
    owner: ownerId
  }

  this.history.push(historyItem)

  return this
}

/**
 * Set Assignee on Instanced Ticket
 * @instance
 * @method setAssignee
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {Object} userId User ID to set as assignee
 */
ticketSchema.methods.setAssignee = async function (ownerId, userId) {
  if (_.isUndefined(userId)) throw new Error('Invalid User Id')
  const permissions = require('../permissions')

  this.assignee = userId
  const user = await userSchema.getUser(userId)

  if (!permissions.canThis(user.role, 'tickets:update') && !permissions.canThis(user.role, 'agent:*')) {
    throw new Error('User does not have permission to be set as an assignee.')
  }

  const historyItem = {
    action: 'ticket:set:assignee',
    description: user.fullname + ' was set as assignee',
    owner: ownerId
  }

  this.history.push(historyItem)

  return this
}

/**
 * Clear the current assignee
 * @instance
 * @method clearAssignee
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 */
ticketSchema.methods.clearAssignee = function (ownerId) {
  this.assignee = undefined
  const historyItem = {
    action: 'ticket:set:assignee',
    description: 'Assignee was cleared',
    owner: ownerId
  }

  this.history.push(historyItem)

  return this
}

/**
 * Sets the ticket type for the instanced Ticket
 * @instance
 * @method setTicketType
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {Object} typeId TicketType Id to set as ticket type
 */
ticketSchema.methods.setTicketType = async function (ownerId, typeId) {
  const typeSchema = require('./tickettype')
  this.type = typeId
  const type = await typeSchema.findOne({ _id: typeId })
  if (!type) throw new Error('Invalid Type Id: ' + typeId)

  const historyItem = {
    action: 'ticket:set:type',
    description: 'Ticket type set to: ' + type.name,
    owner: ownerId
  }

  this.history.push(historyItem)

  return this
}

/**
 * Sets the ticket priority
 * @instance
 * @method setTicketPriority
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {Number} priority Priority to set
 */
ticketSchema.methods.setTicketPriority = async function (ownerId, priority) {
  if (_.isUndefined(priority) || !_.isObject(priority)) throw new Error('Priority must be a PriorityObject.')

  this.priority = priority._id
  const historyItem = {
    action: 'ticket:set:priority',
    description: 'Ticket Priority set to: ' + priority.name,
    owner: ownerId
  }
  this.history.push(historyItem)

  const updatedSelf = await this.populate(['priority'])
  return updatedSelf
}

/**
 * Sets this ticket under the given group Id
 * @instance
 * @method setTicketGroup
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {Object} groupId MongoDB group Id to assign this ticket to
 */
ticketSchema.methods.setTicketGroup = async function (ownerId, groupId) {
  this.group = groupId

  const ticket = await this.populate('group')

  const historyItem = {
    action: 'ticket:set:group',
    description: 'Ticket Group set to: ' + ticket.group.name,
    owner: ownerId
  }
  this.history.push(historyItem)

  return ticket
}

ticketSchema.methods.setTicketDueDate = function (ownerId, dueDate) {
  this.dueDate = dueDate

  const historyItem = {
    action: 'ticket:set:duedate',
    description: 'Ticket Due Date set to: ' + this.dueDate,
    owner: ownerId
  }

  this.history.push(historyItem)

  return this
}

/**
 * Sets this ticket's issue text
 * @instance
 * @method setIssue
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {Object} issue Issue text to set on the ticket
 */
ticketSchema.methods.setIssue = function (ownerId, issue) {
  const marked = require('marked')
  issue = issue.replace(/(\r\n|\n\r|\r|\n)/g, '<br>')
  issue = sanitizeHtml(issue).trim()
  this.issue = xss(marked.parse(issue))

  const historyItem = {
    action: 'ticket:update:issue',
    description: 'Ticket Issue was updated.',
    owner: ownerId
  }

  this.history.push(historyItem)

  return this
}

ticketSchema.methods.setSubject = function (ownerId, subject) {
  this.subject = subject
  const historyItem = {
    action: 'ticket:update:subject',
    description: 'Ticket Subject was updated.',
    owner: ownerId
  }

  this.history.push(historyItem)

  return this
}

/**
 * Updates a given comment inside the comment array on this ticket
 * @instance
 * @method updateComment
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {Object} commentId Comment ID to update
 * @param {String} commentText Text to update the comment to
 */
ticketSchema.methods.updateComment = function (ownerId, commentId, commentText) {
  const comment = _.find(this.comments, function (c) {
    return c._id.toString() === commentId.toString()
  })

  if (_.isUndefined(comment)) {
    throw new Error('Invalid Comment')
  }

  comment.comment = commentText

  const historyItem = {
    action: 'ticket:comment:updated',
    description: 'Comment was updated: ' + commentId,
    owner: ownerId
  }
  this.history.push(historyItem)

  return this
}

/**
 * Removes a comment from the comment array on this ticket.
 * @instance
 * @method removeComment
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {Object} commentId Comment ID to remove
 */
ticketSchema.methods.removeComment = function (ownerId, commentId) {
  this.comments = _.reject(this.comments, function (o) {
    return o._id.toString() === commentId.toString()
  })

  const historyItem = {
    action: 'ticket:delete:comment',
    description: 'Comment was deleted: ' + commentId,
    owner: ownerId
  }

  this.history.push(historyItem)

  return this
}

/**
 * Updates a given Note inside the note array on this ticket
 * @instance
 * @method updateNote
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {Object} noteId Note ID to update
 * @param {String} noteText Text to update the note to
 */
ticketSchema.methods.updateNote = function (ownerId, noteId, noteText) {
  const note = _.find(this.notes, function (c) {
    return c._id.toString() === noteId.toString()
  })
  if (_.isUndefined(note)) {
    throw new Error('Invalid Note')
  }

  note.note = noteText

  const historyItem = {
    action: 'ticket:note:updated',
    description: 'Note was updated: ' + noteId,
    owner: ownerId
  }
  this.history.push(historyItem)

  return this
}

/**
 * Removes a note from the note array on this ticket.
 * @instance
 * @method removeNote
 * @memberof Ticket
 *
 * @param {Object} ownerId Account ID preforming this action
 * @param {Object} noteId Comment ID to remove
 */
ticketSchema.methods.removeNote = function (ownerId, noteId) {
  this.notes = _.reject(this.notes, function (o) {
    return o._id.toString() === noteId.toString()
  })

  const historyItem = {
    action: 'ticket:delete:note',
    description: 'Note was deleted: ' + noteId,
    owner: ownerId
  }
  this.history.push(historyItem)

  return this
}

ticketSchema.methods.getAttachment = function (attachmentId) {
  const attachment = _.find(this.attachments, function (o) {
    return o._id.toString() === attachmentId.toString()
  })

  return attachment
}

ticketSchema.methods.removeAttachment = function (ownerId, attachmentId) {
  const attachment = _.find(this.attachments, function (o) {
    return o._id.toString() === attachmentId.toString()
  })
  this.attachments = _.reject(this.attachments, function (o) {
    return o._id.toString() === attachmentId.toString()
  })

  if (_.isUndefined(attachment)) {
    return this
  }

  const historyItem = {
    action: 'ticket:delete:attachment',
    description: 'Attachment was deleted: ' + attachment.name,
    owner: ownerId
  }

  this.history.push(historyItem)

  return this
}

ticketSchema.methods.addSubscriber = function (userId) {
  const hasSub = _.some(this.subscribers, function (i) {
    return i._id.toString() === userId.toString()
  })

  if (!hasSub) {
    this.subscribers.push(userId)
  }

  return this
}

ticketSchema.methods.removeSubscriber = function (userId) {
  const user = _.find(this.subscribers, function (i) {
    return i._id.toString() === userId.toString()
  })

  if (_.isUndefined(user) || _.isEmpty(user) || _.isNull(user)) return this

  this.subscribers = _.reject(this.subscribers, function (i) {
    return i._id.toString() === userId.toString()
  })

  return this
}

/**
 * Gets all tickets that are not marked as deleted <br> <br>
 *
 * **Deep populates: group, group.members, group.sendMailTo, comments, comments.owner**
 *
 * @memberof Ticket
 * @static
 * @method getAll
 *
 * @example
 * ticketSchema.getAll(function(err, tickets) {
 *    if (err) throw err;
 *
 *    //tickets is an array
 * });
 */
ticketSchema.statics.getAll = async function () {
  return this.model(COLLECTION)
    .find({ deleted: false })
    .populate('owner assignee', '-password -__v -preferences -iOSDeviceTokens -tOTPKey')
    .populate('type tags status group')
    .sort({ status: 1 })
    .lean()
    .exec()
}

ticketSchema.statics.getForCache = async function () {
  const t365 = moment
    .utc()
    .hour(23)
    .minute(59)
    .second(50)
    .subtract(365, 'd')
    .toDate()

  return this.model(COLLECTION)
    .find({ date: { $gte: t365 }, deleted: false })
    .sort('date')
    .lean()
    .exec()
}

ticketSchema.statics.getAllNoPopulate = async function () {
  return this.model(COLLECTION)
    .find({ deleted: false })
    .sort({ status: 1 })
    .lean()
    .exec()
}

ticketSchema.statics.getAllByStatus = async function (status) {
  if (!_.isArray(status)) {
    status = [status]
  }

  return this.model(COLLECTION)
    .find({ status: { $in: status }, deleted: false })
    .populate(
      'owner assignee comments.owner notes.owner subscribers history.owner',
      'username fullname email role image title'
    )
    .populate('type tags status group')
    .sort({ status: 1 })
    .lean()
    .exec()
}

/**
 * Gets Tickets with a given group id.
 *
 * @memberof Ticket
 * @static
 * @method getTickets
 * @param {Array} grpIds Group Id to retrieve tickets for.
 */
ticketSchema.statics.getTickets = async function (grpIds) {
  if (_.isUndefined(grpIds)) {
    throw new Error('Invalid GroupId - TicketSchema.GetTickets()')
  }

  if (!_.isArray(grpIds)) {
    throw new Error('Invalid GroupId (Must be of type Array) - TicketSchema.GetTickets()')
  }

  return this.model(COLLECTION)
    .find({ group: { $in: grpIds }, deleted: false })
    .populate(
      'owner assignee comments.owner notes.owner subscribers history.owner',
      'username fullname email role image title'
    )
    .populate('type tags status group')
    .sort({ status: 1 })
    .exec()
}

/**
 * Gets Tickets with a given departments and a JSON Object <br/><br/>
 * *Sorts on UID desc.*
 * @memberof Ticket
 * @static
 * @method getTicketsByDepartments
 *
 * @param {Object} departments Departments to retrieve tickets for.
 * @param {Object} object JSON Object with query options
 *
 * @example
 * //Object Options
 * {
 *    limit: 10,
 *    page: 0,
 *    closed: false,
 *    status: 1
 * }
 */
ticketSchema.statics.getTicketsByDepartments = async function (departments, object) {
  if (!departments || !_.isObject(departments) || !object) { throw new Error('Invalid Data - TicketSchema.GetTicketsByDepartments()') }

  if (_.some(departments, { allGroups: true })) {
    const groups = await groupSchema.find({})
    return this.getTicketsWithObject(groups, object)
  } else {
    const groups = _.flattenDeep(
      departments.map(function (d) {
        return d.groups.map(function (g) {
          return g._id
        })
      })
    )

    return this.getTicketsWithObject(groups, object)
  }
}

function buildQueryWithObject (SELF, grpId, object, count) {
  const limit = object.limit || 10
  const page = object.page || 0
  let _status = object.status

  // Check up on status formatting
  if (_.isArray(_status)) {
    // This is a hack - querystring adds status in the array as [ "1,2,3" ]
    // This will convert the array to [ "1", "2", "3" ]
    _status = _.join(_status, ',').split(',')
  }

  if (object.filter && object.filter.groups) {
    grpId = _.intersection(
      object.filter.groups,
      _.map(grpId, g => g._id.toString())
    )
  }

  let query
  if (count) query = SELF.model(COLLECTION).countDocuments({ groups: { $in: grpId }, deleted: false })
  else {
    query = SELF.model(COLLECTION)
      .find({ group: { $in: grpId }, deleted: false })
      .populate(
        'owner assignee subscribers comments.owner notes.owner history.owner',
        'username fullname email role image title'
      )
      .populate('assignee', 'username fullname email role image title')
      .populate('type tags status group')
      .sort({ uid: -1 })
  }

  // Query with Limit?
  if (limit !== -1) query.skip(page * limit).limit(limit)
  // Status Query
  if (_.isArray(_status) && _status.length > 0) {
    query.where({ status: { $in: _status } })
  }

  // Filter Query
  if (object.filter) {
    // Filter on UID
    if (object.filter.uid) {
      object.filter.uid = parseInt(object.filter.uid)
      if (!_.isNaN(object.filter.uid)) query.or([{ uid: object.filter.uid }])
    }

    // Priority Filter
    if (object.filter.priority) query.where({ priority: { $in: object.filter.priority } })

    // Ticket Type Filter
    if (object.filter.types) query.where({ type: { $in: object.filter.types } })

    // Tags Filter
    if (object.filter.tags) query.where({ tags: { $in: object.filter.tags } })

    // Assignee Filter
    if (object.filter.assignee) query.where({ assignee: { $in: object.filter.assignee } })

    // Unassigned Filter
    if (object.filter.unassigned) query.where({ assignee: { $exists: false } })

    // Owner Filter
    if (object.filter.owner) query.where({ owner: { $in: object.filter.owner } })

    // Subject Filter
    if (object.filter.subject) query.or([{ subject: new RegExp(object.filter.subject, 'i') }])

    // Issue Filter
    if (object.filter.issue) query.or([{ issue: new RegExp(object.filter.issue, 'i') }])

    // Date Filter
    if (object.filter.date) {
      let startDate = new Date(2000, 0, 1, 0, 0, 1)
      let endDate = new Date()
      if (object.filter.date.start) startDate = new Date(object.filter.date.start)
      if (object.filter.date.end) endDate = new Date(object.filter.date.end)

      query.where({ date: { $gte: startDate, $lte: endDate } })
    }
  }

  if (object.owner) query.where('owner', object.owner)
  if (object.assignedSelf) query.where('assignee', object.user)
  if (object.unassigned) query.where({ assignee: { $exists: false } })

  return query
}

ticketSchema.statics.getTicketsWithObject = async function (grpId, object) {
  if (!grpId || !_.isArray(grpId) || !_.isObject(object)) { throw new Error('Invalid parameter in - TicketSchema.GetTicketsWithObject()') }

  const query = buildQueryWithObject(this, grpId, object)

  return query.exec()
}

ticketSchema.statics.getCountWithObject = async function (grpId, object) {
  if (!grpId || !_.isArray(grpId) || !_.isObject(object)) { throw new Error('Invalid parameter in - TicketSchema.GetCountWithObject()') }

  const query = buildQueryWithObject(this, grpId, object, true)

  return query.lean().exec()
}

/**
 * Gets Tickets for status in given group. <br/><br/>
 * *Sorts on UID desc*
 * @memberof Ticket
 * @static
 * @method getTicketsByStatus
 *
 * @param {Object} grpId Group Id to retrieve tickets for.
 * @param {Number} status Status number to check
 */
ticketSchema.statics.getTicketsByStatus = async function (grpId, status) {
  if (_.isUndefined(grpId)) {
    throw new Error('Invalid GroupId - TicketSchema.GetTickets()')
  }

  if (!_.isArray(grpId)) {
    throw new Error('Invalid GroupId (Must be of type Array) - TicketSchema.GetTickets()')
  }

  return this.model(COLLECTION)
    .find({ group: { $in: grpId }, status, deleted: false })
    .populate(
      'owner assignee comments.owner notes.owner subscribers history.owner',
      'username fullname email role image title'
    )
    .populate('type tags status group')
    .sort({ uid: -1 })
    .exec()
}

/**
 * Gets Single ticket with given UID.
 * @memberof Ticket
 * @static
 * @method getTicketByUid
 *
 * @param {Number} uid Unique Id for ticket.
 */
ticketSchema.statics.getTicketByUid = async function (uid) {
  if (_.isUndefined(uid)) throw new Error('Invalid Uid - TicketSchema.GetTicketByUid()')

  return this.model(COLLECTION)
    .findOne({ uid, deleted: false })
    .populate(
      'owner assignee comments.owner notes.owner subscribers history.owner',
      'username fullname email role image title'
    )
    .populate('type tags status group')
    .exec()
}

/**
 * Gets Single ticket with given object _id.
 * @memberof Ticket
 * @static
 * @method getTicketById
 *
 * @param {Object} id MongoDb _id.
 */
ticketSchema.statics.getTicketById = async function (id) {
  if (_.isUndefined(id)) {
    throw new Error('Invalid Id - TicketSchema.GetTicketById()')
  }

  return this.model(COLLECTION)
    .findOne({ _id: id, deleted: false })
    .populate(
      'owner assignee comments.owner notes.owner subscribers history.owner',
      'username fullname email role image title'
    )
    .populate('type tags status')
    .populate({
      path: 'group',
      model: groupSchema,
      populate: [
        {
          path: 'members',
          model: userSchema,
          select: '-__v -iOSDeviceTokens -accessToken -tOTPKey'
        },
        {
          path: 'sendMailTo',
          model: userSchema,
          select: '-__v -iOSDeviceTokens -accessToken -tOTPKey'
        }
      ]
    })
    .exec()
}

/**
 * Gets tickets by given Requester User Id
 * @memberof Ticket
 * @static
 * @method getTicketsByRequester
 *
 * @param {Object} userId MongoDb _id of user.
 */
ticketSchema.statics.getTicketsByRequester = async function (userId) {
  if (_.isUndefined(userId)) throw new Error('Invalid Requester Id - TicketSchema.GetTicketsByRequester()')

  return this.model(COLLECTION)
    .find({ owner: userId, deleted: false })
    .limit(10000)
    .populate(
      'owner assignee comments.owner notes.owner subscribers history.owner',
      'username fullname email role image title'
    )
    .populate('type tags status')
    .populate({
      path: 'group',
      model: groupSchema,
      populate: [
        {
          path: 'members',
          model: userSchema,
          select: '-__v -iOSDeviceTokens -accessToken -tOTPKey'
        },
        {
          path: 'sendMailTo',
          model: userSchema,
          select: '-__v -iOSDeviceTokens -accessToken -tOTPKey'
        }
      ]
    })
    .exec()
}

ticketSchema.statics.getTicketsWithSearchString = async function (grps, search) {
  if (_.isUndefined(grps) || _.isUndefined(search)) { throw new Error('Invalid Post Data - TicketSchema.GetTicketsWithSearchString()') }

  const [uidResults, subjectResults, issueResults] = await Promise.all([
    this.model(COLLECTION)
      .find({
        group: { $in: grps },
        deleted: false,
        $where: '/^' + search + '.*/.test(this.uid)'
      })
      .populate(
        'owner assignee comments.owner notes.owner subscribers history.owner',
        'username fullname email role image title'
      )
      .populate('type tags status group')
      .limit(100)
      .exec(),
    this.model(COLLECTION)
      .find({
        group: { $in: grps },
        deleted: false,
        subject: { $regex: search, $options: 'i' }
      })
      .populate(
        'owner assignee comments.owner notes.owner subscribers history.owner',
        'username fullname email role image title'
      )
      .populate('type tags status group')
      .limit(100)
      .exec(),
    this.model(COLLECTION)
      .find({
        group: { $in: grps },
        deleted: false,
        issue: { $regex: search, $options: 'i' }
      })
      .populate(
        'owner assignee comments.owner notes.owner subscribers history.owner',
        'username fullname email role image title'
      )
      .populate('type tags status group')
      .limit(100)
      .exec()
  ])

  const tickets = [uidResults, subjectResults, issueResults]

  return _.uniqBy(_.flatten(tickets), function (i) {
    return i.uid
  })
}

/**
 * Gets tickets that are overdue
 * @memberof Ticket
 * @static
 * @method getOverdue
 *
 * @param {Array} grpId Group Array of User
 */
ticketSchema.statics.getOverdue = async function (grpId) {
  if (_.isUndefined(grpId)) throw new Error('Invalid Group Ids - TicketSchema.GetOverdue()')

  // Step 1: Get statuses with slatimer enabled
  const statuses = await statusSchema.find({ slatimer: true })
  const statusesMapped = statuses.map(i => i._id)

  // Step 2: Find tickets in those statuses
  const tickets = await this.model(COLLECTION)
    .find({
      group: { $in: grpId },
      status: { $in: statusesMapped },
      deleted: false
    })
    .select('_id date updated')
    .lean()
    .exec()

  // Step 3: Transform tickets
  const t = _.map(tickets, function (i) {
    return _.transform(
      i,
      function (result, value, key) {
        if (key === '_id') result._id = value
        if (key === 'priority') result.overdueIn = value.overdueIn
        if (key === 'date') result.date = value
        if (key === 'updated') result.updated = value
      },
      {}
    )
  })

  // Step 4: Filter overdue tickets
  const now = new Date()
  let ids = _.filter(t, function (ticket) {
    if (!ticket.date && !ticket.updated) {
      return false
    }

    let timeout
    if (ticket.updated) {
      const updated = new Date(ticket.updated)
      timeout = new Date(updated)
      timeout.setMinutes(updated.getMinutes() + ticket.overdueIn)
    } else {
      const date = new Date(ticket.date)
      timeout = new Date(date)
      timeout.setMinutes(date.getMinutes() + ticket.overdueIn)
    }

    return now > timeout
  })

  ids = _.map(ids, '_id')

  // Step 5: Return final tickets
  return this.model(COLLECTION)
    .find({ _id: { $in: ids } })
    .limit(50)
    .select('_id uid subject updated date')
    .lean()
    .exec()
}

/**
 * Gets tickets via tag id
 * @memberof Ticket
 * @static
 * @method getTicketsByTag
 *
 * @param {Array} grpId Group Array of User
 * @param {string} tagId Tag Id
 */
ticketSchema.statics.getTicketsByTag = async function (grpId, tagId) {
  if (_.isUndefined(grpId)) throw new Error('Invalid Group Ids - TicketSchema.GetTicketsByTag()')
  if (_.isUndefined(tagId)) throw new Error('Invalid Tag Id - TicketSchema.GetTicketsByTag()')

  return this.model(COLLECTION)
    .find({ group: { $in: grpId }, tags: tagId, deleted: false })
    .exec()
}

/**
 * Gets all tickets via tag id
 * @memberof Ticket
 * @static
 * @method getAllTicketsByTag
 *
 * @param {string} tagId Tag Id
 */
ticketSchema.statics.getAllTicketsByTag = async function (tagId) {
  if (_.isUndefined(tagId)) throw new Error('Invalid Tag Id - TicketSchema.GetAllTicketsByTag()')

  return this.model(COLLECTION)
    .find({ tags: tagId, deleted: false })
    .exec()
}

/**
 * Gets tickets via type id
 * @memberof Ticket
 * @static
 * @method getTicketsByType
 *
 * @param {Array} grpId Group Array of User
 * @param {string} typeId Type Id
 * @param {Boolean} limit Should Limit results?
 */
ticketSchema.statics.getTicketsByType = async function (grpId, typeId, limit) {
  if (_.isUndefined(grpId)) throw new Error('Invalid Group Ids = TicketSchema.GetTicketsByType()')
  if (_.isUndefined(typeId)) throw new Error('Invalid Ticket Type Id - TicketSchema.GetTicketsByType()')

  const q = this.model(COLLECTION).find({ group: { $in: grpId }, type: typeId, deleted: false })
  if (limit) {
    q.limit(1000)
  }

  return q.lean().exec()
}

/**
 * Gets all tickets via type id
 * @memberof Ticket
 * @static
 * @method getAllTicketsByType
 *
 * @param {string} typeId Type Id
 */
ticketSchema.statics.getAllTicketsByType = async function (typeId) {
  if (_.isUndefined(typeId)) throw new Error('Invalid Ticket Type Id - TicketSchema.GetAllTicketsByType()')

  return this.model(COLLECTION)
    .find({ type: typeId })
    .lean()
    .exec()
}

ticketSchema.statics.updateType = async function (oldTypeId, newTypeId) {
  if (_.isUndefined(oldTypeId) || _.isUndefined(newTypeId)) {
    throw new Error('Invalid IDs - TicketSchema.UpdateType()')
  }

  return this.model(COLLECTION).updateMany({ type: oldTypeId }, { $set: { type: newTypeId } })
}

ticketSchema.statics.getAssigned = async function (userId) {
  if (_.isUndefined(userId)) throw new Error('Invalid Id - TicketSchema.GetAssigned()')

  const statuses = await statusSchema.find({ isResolved: false })
  const unresolvedStatusesIds = statuses.map(i => i._id)

  return this.model(COLLECTION)
    .find({ assignee: userId, deleted: false, status: { $in: unresolvedStatusesIds } })
    .populate(
      'owner assignee comments.owner notes.owner subscribers history.owner',
      'username fullname email role image title'
    )
    .populate('type tags status group')
    .exec()
}

/**
 * Gets count of X Top Groups
 *
 * @memberof Ticket
 * @static
 * @method getTopTicketGroups
 *
 * @param {Number} timespan Timespan to get the top groups (default: 9999)
 * @param {Number} top Top number of Groups to return (default: 5)
 * @example
 * ticketSchema.getTopTicketGroups(5, function(err, results) {
 *    if (err) throw err;
 *
 *    //results is an array with name of group and count of total tickets
 *    results[x].name
 *    results[x].count
 * });
 */
ticketSchema.statics.getTopTicketGroups = async function (timespan, top) {
  if (_.isUndefined(timespan) || _.isNaN(timespan) || timespan === 0) timespan = -1
  if (_.isUndefined(top) || _.isNaN(top)) top = 5

  const today = moment
    .utc()
    .hour(23)
    .minute(59)
    .second(59)
  const tsDate = today.clone().subtract(timespan, 'd')
  let query = {
    date: { $gte: tsDate.toDate(), $lte: today.toDate() },
    deleted: false
  }
  if (timespan === -1) {
    query = { deleted: false }
  }

  // Step 1: Fetch tickets with group info
  const t = await this.model(COLLECTION)
    .find(query)
    .select('group')
    .populate('group', 'name')
    .lean()
    .exec()

  const arr = []
  const ticketsDb = []

  for (let i = 0; i < t.length; i++) {
    const ticket = t[i]
    if (ticket.group) {
      ticketsDb.push({
        ticketId: ticket._id,
        groupId: ticket.group._id
      })
      const o = {}
      o._id = ticket.group._id
      o.name = ticket.group.name

      if (!_.filter(arr, { name: o.name }).length) {
        arr.push(o)
      }
    }
  }

  const grps = _.uniq(arr)

  // Step 2: Count tickets per group
  let topCount = []
  for (let g = 0; g < grps.length; g++) {
    const tickets = []
    const grp = grps[g]
    for (let i = 0; i < ticketsDb.length; i++) {
      if (ticketsDb[i].groupId === grp._id) {
        tickets.push(ticketsDb)
      }
    }

    topCount.push({ name: grp.name, count: tickets.length })
  }

  topCount = _.sortBy(topCount, function (o) {
    return -o.count
  })

  topCount = topCount.slice(0, top)

  return topCount
}

ticketSchema.statics.getTagCount = async function (tagId) {
  if (_.isUndefined(tagId)) throw new Error('Invalid Tag Id - TicketSchema.GetTagCount()')

  return this.model(COLLECTION)
    .countDocuments({ tags: tagId, deleted: false })
    .exec()
}

ticketSchema.statics.getTypeCount = async function (typeId) {
  if (_.isUndefined(typeId)) throw new Error('Invalid Type Id - TicketSchema.GetTypeCount()')

  return this.model(COLLECTION)
    .countDocuments({ type: typeId, deleted: false })
    .exec()
}

ticketSchema.statics.getCount = async function () {
  return this.model(COLLECTION)
    .countDocuments({ deleted: false })
    .lean()
    .exec()
}

/**
 * Mark a ticket as deleted in MongoDb <br/><br/>
 * *Ticket has its ```deleted``` flag set to true*
 *
 * @memberof Ticket
 * @static
 * @method softDelete
 *
 * @param {Object} oId Ticket Object _id
 */
ticketSchema.statics.softDelete = async function (oId) {
  if (_.isUndefined(oId)) throw new Error('Invalid ObjectID - TicketSchema.SoftDelete()')

  return this.model(COLLECTION).findOneAndUpdate({ _id: oId }, { deleted: true }, { returnDocument: 'after' })
}

ticketSchema.statics.softDeleteUid = async function (uid) {
  if (_.isUndefined(uid)) throw new Error('Invalid UID - TicketSchema.SoftDeleteUid()')

  return this.model(COLLECTION).findOneAndUpdate({ uid }, { deleted: true }, { returnDocument: 'after' })
}

ticketSchema.statics.restoreDeleted = async function (oId) {
  if (_.isUndefined(oId)) throw new Error('Invalid ObjectID - TicketSchema.RestoreDeleted()')

  return this.model(COLLECTION).findOneAndUpdate({ _id: oId }, { deleted: false }, { returnDocument: 'after' })
}

ticketSchema.statics.getDeleted = async function () {
  return this.model(COLLECTION)
    .find({ deleted: true })
    .populate('group')
    .sort({ uid: -1 })
    .limit(1000)
    .exec()
}

module.exports = mongoose.model(COLLECTION, ticketSchema)
