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
const _ = require('lodash')
const winston = require('../logger')
const marked = require('marked')
const sanitizeHtml = require('sanitize-html')
const utils = require('../helpers/utils')
const emitter = require('../emitter')
const socketEvents = require('./socketEventConsts')
const ticketSchema = require('../models/ticket')
const prioritySchema = require('../models/ticketpriority')
const userSchema = require('../models/user')
const roleSchema = require('../models/role')
const permissions = require('../permissions')
const xss = require('xss')

const events = {}

function register (socket) {
  events.onUpdateTicketGrid(socket)
  events.onUpdateTicketStatus(socket)
  events.onUpdateTicket(socket)
  events.onUpdateAssigneeList(socket)
  events.onSetAssignee(socket)
  events.onUpdateTicketTags(socket)
  events.onClearAssignee(socket)
  events.onSetTicketType(socket)
  events.onSetTicketPriority(socket)
  events.onSetTicketGroup(socket)
  events.onSetTicketDueDate(socket)
  events.onSetTicketIssue(socket)
  events.onCommentNoteSet(socket)
  events.onRemoveCommentNote(socket)
  events.onAttachmentsUIUpdate(socket)
}

function eventLoop () {}

events.onUpdateTicketGrid = function (socket) {
  socket.on('ticket:updategrid', function () {
    utils.sendToAllConnectedClients(io, 'ticket:updategrid')
  })
}

events.onUpdateTicketStatus = socket => {
  socket.on(socketEvents.TICKETS_STATUS_SET, async data => {
    const ticketId = data._id
    const status = data.value
    const ownerId = socket.request.user._id
    // winston.debug('Received Status')
    try {
      let ticket = await ticketSchema.getTicketById(ticketId)
      ticket = await ticket.setStatus(ownerId, status)
      ticket = await ticket.save()
      ticket = await ticket.populate('status')

      // emitter.emit('ticket:updated', t)
      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_STATUS_UPDATE, {
        tid: ticket._id,
        owner: ticket.owner,
        status: ticket.status
      })
    } catch (e) {
      winston.debug(e)
      winston.log('info', 'Error in Status' + JSON.stringify(e))
    }
  })
}

events.onUpdateTicket = function (socket) {
  socket.on(socketEvents.TICKETS_UPDATE, async data => {
    try {
      const ticket = await ticketSchema.getTicketById(data._id)

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UPDATE, ticket)
    } catch (error) {
      // Blank
    }
  })
}

events.onUpdateAssigneeList = function (socket) {
  socket.on(socketEvents.TICKETS_ASSIGNEE_LOAD, async function () {
    try {
      const roles = await roleSchema.getAgentRoles()
      const users = await userSchema.find({ role: { $in: roles }, deleted: false })

      const sortedUser = _.sortBy(users, 'fullname')

      utils.sendToSelf(socket, socketEvents.TICKETS_ASSIGNEE_LOAD, sortedUser)
    } catch (err) {
      winston.warn(err)
    }
  })
}

events.onSetAssignee = function (socket) {
  socket.on(socketEvents.TICKETS_ASSIGNEE_SET, async function (data) {
    const userId = data._id
    const ownerId = socket.request.user._id
    const ticketId = data.ticketId
    try {
      let ticket = await ticketSchema.getTicketById(ticketId)

      // eslint-disable-next-line no-unused-vars
      const [_setAssigneeResult, subscriberResult] = await Promise.all([
        ticket.setAssignee(ownerId, userId),
        ticket.addSubscriber(userId)
      ])

      ticket = subscriberResult
      ticket = await ticket.save()
      ticket = await ticket.populate('assignee')

      emitter.emit('ticket:subscriber:update', {
        user: userId,
        subscribe: true
      })

      emitter.emit(socketEvents.TICKETS_ASSIGNEE_SET, {
        assigneeId: ticket.assignee._id,
        ticketId: ticket._id,
        ticketUid: ticket.uid,
        hostname: socket.handshake.headers.host
      })

      // emitter.emit('ticket:updated', ticket)
      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_ASSIGNEE_UPDATE, ticket)
    } catch (err) {
      winston.warn(err)
    }
  })
}

events.onSetTicketType = function (socket) {
  socket.on(socketEvents.TICKETS_TYPE_SET, async function (data) {
    const ticketId = data._id
    const typeId = data.value
    const ownerId = socket.request.user._id

    if (_.isUndefined(ticketId) || _.isUndefined(typeId)) return true
    try {
      const ticket = await ticketSchema.getTicketById(ticketId)
      const t = await ticket.setTicketType(ownerId, typeId)
      const tt = await t.save()
      await ticketSchema.populate(tt, 'type')

      // emitter.emit('ticket:updated', tt)
      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_TYPE_UPDATE, tt)
    } catch (err) {
      winston.warn(err)
    }
  })
}

events.onUpdateTicketTags = socket => {
  socket.on(socketEvents.TICKETS_UI_TAGS_UPDATE, async data => {
    const ticketId = data.ticketId
    if (_.isUndefined(ticketId)) return true

    try {
      const ticket = await ticketSchema.findOne({ _id: ticketId }).populate('tags')

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_TAGS_UPDATE, ticket)
    } catch (e) {
      // Blank
    }
  })
}

events.onSetTicketPriority = function (socket) {
  socket.on(socketEvents.TICKETS_PRIORITY_SET, async function (data) {
    const ticketId = data._id
    const priority = data.value
    const ownerId = socket.request.user._id

    if (_.isUndefined(ticketId) || _.isUndefined(priority)) return true
    try {
      const ticket = await ticketSchema.getTicketById(ticketId)
      const p = await prioritySchema.getPriority(priority)
      const t = await ticket.setTicketPriority(ownerId, p)
      const tt = await t.save()

      // emitter.emit('ticket:updated', tt)
      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_PRIORITY_UPDATE, tt)
    } catch (err) {
      winston.debug(err)
    }
  })
}

events.onClearAssignee = socket => {
  socket.on(socketEvents.TICKETS_ASSIGNEE_CLEAR, async id => {
    const ownerId = socket.request.user._id

    try {
      const ticket = await ticketSchema.findOne({ _id: id })
      const updatedTicket = await ticket.clearAssignee(ownerId)
      const savedTicket = await updatedTicket.save()

      // emitter.emit('ticket:updated', tt)
      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_ASSIGNEE_UPDATE, savedTicket)
    } catch (e) {
      // Blank
    }
  })
}

events.onSetTicketGroup = function (socket) {
  socket.on(socketEvents.TICKETS_GROUP_SET, async function (data) {
    const ticketId = data._id
    const groupId = data.value
    const ownerId = socket.request.user._id

    if (_.isUndefined(ticketId) || _.isUndefined(groupId)) return true

    try {
      const ticket = await ticketSchema.getTicketById(ticketId)
      const t = await ticket.setTicketGroup(ownerId, groupId)
      const tt = await t.save()
      await ticketSchema.populate(tt, 'group')

      // emitter.emit('ticket:updated', tt)
      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_GROUP_UPDATE, tt)
    } catch (err) {
      winston.warn(err)
    }
  })
}

events.onSetTicketDueDate = function (socket) {
  socket.on(socketEvents.TICKETS_DUEDATE_SET, async function (data) {
    const ticketId = data._id
    const dueDate = data.value
    const ownerId = socket.request.user._id

    if (_.isUndefined(ticketId)) return true

    try {
      const ticket = await ticketSchema.getTicketById(ticketId)
      const t = await ticket.setTicketDueDate(ownerId, dueDate)
      const tt = await t.save()

      // emitter.emit('ticket:updated', tt)
      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_DUEDATE_UPDATE, tt)
    } catch (err) {
      winston.warn(err)
    }
  })
}

events.onSetTicketIssue = socket => {
  socket.on(socketEvents.TICKETS_ISSUE_SET, async data => {
    const ticketId = data._id
    const issue = data.value
    const subject = data.subject
    const ownerId = socket.request.user._id
    if (_.isUndefined(ticketId) || _.isUndefined(issue)) return true

    try {
      let ticket = await ticketSchema.getTicketById(ticketId)
      if (subject !== ticket.subject) ticket = await ticket.setSubject(ownerId, subject)
      if (issue !== ticket.issue) ticket = await ticket.setIssue(ownerId, issue)

      ticket = await ticket.save()

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UPDATE, ticket)
    } catch (e) {
      // Blank
    }
  })
}

events.onCommentNoteSet = socket => {
  socket.on(socketEvents.TICKETS_COMMENT_NOTE_SET, async data => {
    const ownerId = socket.request.user._id
    const ticketId = data._id
    const itemId = data.item
    let text = data.value
    const isNote = data.isNote

    if (_.isUndefined(ticketId) || _.isUndefined(itemId) || _.isUndefined(text)) return true

    marked.setOptions({
      breaks: true
    })

    text = sanitizeHtml(text).trim()
    const markedText = xss(marked.parse(text))

    try {
      let ticket = await ticketSchema.getTicketById(ticketId)
      if (!isNote) ticket = await ticket.updateComment(ownerId, itemId, markedText)
      else ticket = await ticket.updateNote(ownerId, itemId, markedText)
      ticket = await ticket.save()

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UPDATE, ticket)
    } catch (e) {
      winston.error(e)
    }
  })
}

events.onRemoveCommentNote = socket => {
  socket.on(socketEvents.TICKETS_COMMENT_NOTE_REMOVE, async data => {
    const ownerId = socket.request.user._id
    const ticketId = data._id
    const itemId = data.value
    const isNote = data.isNote

    try {
      let ticket = await ticketSchema.getTicketById(ticketId)
      if (!isNote) ticket = await ticket.removeComment(ownerId, itemId)
      else ticket = await ticket.removeNote(ownerId, itemId)

      ticket = await ticket.save()

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UPDATE, ticket)
    } catch (e) {
      // Blank
    }
  })
}

events.onAttachmentsUIUpdate = socket => {
  socket.on(socketEvents.TICKETS_UI_ATTACHMENTS_UPDATE, async data => {
    const ticketId = data._id

    if (_.isUndefined(ticketId)) return true

    try {
      const ticket = await ticketSchema.getTicketById(ticketId)
      const user = socket.request.user
      if (_.isUndefined(user)) return true

      const canRemoveAttachments = permissions.canThis(user.role, 'tickets:removeAttachment')

      const data = {
        ticket,
        canRemoveAttachments
      }

      utils.sendToAllConnectedClients(io, socketEvents.TICKETS_UI_ATTACHMENTS_UPDATE, data)
    } catch (e) {
      // Blank
    }
  })
}

module.exports = {
  events,
  eventLoop,
  register
}
