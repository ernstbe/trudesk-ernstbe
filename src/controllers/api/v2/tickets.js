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
 *  Updated:    2/14/19 12:05 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const _ = require('lodash')
const logger = require('../../../logger')
const apiUtils = require('../apiUtils')
const Models = require('../../../models')
const permissions = require('../../../permissions')
const ticketStatusSchema = require('../../../models/ticketStatus')
const { getDeadlineStatus } = require('../../../helpers/deadlineHelper')

const ticketsV2 = {}

ticketsV2.create = function (req, res) {
  const postTicket = req.body
  if (!postTicket) return apiUtils.sendApiError_InvalidPostData(res)
}

ticketsV2.get = async (req, res) => {
  const query = req.query
  const type = query.type || 'all'

  let limit = 50
  let page = 0

  try {
    limit = query.limit ? parseInt(query.limit) : limit
    page = query.page ? parseInt(query.page) : page
  } catch (e) {
    logger.warn(e)
    return apiUtils.sendApiError_InvalidPostData(res)
  }

  const queryObject = {
    limit,
    page
  }

  try {
    let groups = []
    if (req.user.role.isAdmin || req.user.role.isAgent) {
      const dbGroups = await Models.Department.getDepartmentGroupsOfUser(req.user._id)
      groups = dbGroups.map(g => g._id)
    } else {
      groups = await Models.Group.getAllGroupsOfUser(req.user._id)
    }

    const mappedGroups = groups.map(g => g._id)

    const statuses = await ticketStatusSchema.find({ isResolved: false })

    switch (type.toLowerCase()) {
      case 'active':
        queryObject.status = statuses.map(i => i._id.toString())
        break
      case 'assigned':
        queryObject.filter = {
          assignee: [req.user._id]
        }
        break
      case 'unassigned':
        queryObject.unassigned = true
        break
      case 'new':
        queryObject.status = [0]
        break
      case 'open':
        queryObject.status = [1]
        break
      case 'pending':
        queryObject.status = [2]
        break
      case 'closed':
        queryObject.status = [3]
        break
      case 'filter':
        try {
          queryObject.filter = JSON.parse(query.filter)
          queryObject.status = queryObject.filter.status
        } catch (error) {
          logger.warn(error)
        }
        break
    }

    if (!permissions.canThis(req.user.role, 'tickets:viewall', false)) queryObject.owner = req.user._id

    const tickets = await Models.Ticket.getTicketsWithObject(mappedGroups, queryObject)
    const totalCount = await Models.Ticket.getCountWithObject(mappedGroups, queryObject)

    return apiUtils.sendApiSuccess(res, {
      tickets,
      count: tickets.length,
      totalCount,
      page,
      prevPage: page === 0 ? 0 : page - 1,
      nextPage: page * limit + limit <= totalCount ? page + 1 : page
    })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.single = async function (req, res) {
  const uid = req.params.uid
  if (!uid) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    if (req.user.role.isAdmin || req.user.role.isAgent) {
      const dbGroups = await Models.Department.getDepartmentGroupsOfUser(req.user._id)
      const groups = dbGroups.map(function (g) {
        return g._id.toString()
      })

      if (groups.includes(ticket.group._id.toString())) {
        return apiUtils.sendApiSuccess(res, { ticket })
      } else {
        return apiUtils.sendApiError(res, 403, 'Forbidden')
      }
    } else {
      const userGroups = await Models.Group.getAllGroupsOfUser(req.user._id)
      const groupIds = userGroups.map(function (m) {
        return m._id.toString()
      })

      if (groupIds.includes(ticket.group._id.toString())) {
        return apiUtils.sendApiSuccess(res, { ticket })
      } else {
        return apiUtils.sendApiError(res, 403, 'Forbidden')
      }
    }
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message || err)
  }
}

ticketsV2.update = async function (req, res) {
  const uid = req.params.uid
  const putTicket = req.body.ticket
  if (!uid || !putTicket) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  try {
    // todo: complete this...
    const ticket = await Models.Ticket.getTicketByUid(uid)
    return apiUtils.sendApiSuccess(res, ticket)
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.batchUpdate = async function (req, res) {
  const batch = req.body.batch
  if (!_.isArray(batch)) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    await Promise.all(batch.map(async (batchTicket) => {
      const ticket = await Models.Ticket.getTicketById(batchTicket.id)

      if (!_.isUndefined(batchTicket.status)) {
        ticket.status = batchTicket.status
        const HistoryItem = {
          action: 'ticket:set:status',
          description: 'status set to: ' + batchTicket.status,
          owner: req.user._id
        }

        ticket.history.push(HistoryItem)
      }

      await ticket.save()
    }))

    return apiUtils.sendApiSuccess(res)
  } catch (err) {
    return apiUtils.sendApiError(res, 400, err.message)
  }
}

ticketsV2.updateMetadata = async function (req, res) {
  const uid = req.params.uid
  const metadata = req.body.metadata
  if (!uid || !metadata || !_.isObject(metadata)) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  const allowedFields = ['estimatedCost', 'actualCost', 'vendor', 'orderNumber', 'approvedBy', 'approvalDate']

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    if (!ticket.metadata) ticket.metadata = {}

    for (let i = 0; i < allowedFields.length; i++) {
      const field = allowedFields[i]
      if (!_.isUndefined(metadata[field])) {
        ticket.metadata[field] = metadata[field]
      }
    }

    ticket.markModified('metadata')
    ticket.updated = new Date()

    const historyItem = {
      action: 'ticket:update:metadata',
      description: 'Ticket metadata was updated',
      owner: req.user._id
    }
    ticket.history.push(historyItem)

    await ticket.save()

    return apiUtils.sendApiSuccess(res, { ticket })
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.delete = async function (req, res) {
  const uid = req.params.uid
  if (!uid) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const success = await Models.Ticket.softDeleteUid(uid)
    if (!success) return apiUtils.sendApiError(res, 500, 'Unable to delete ticket')

    return apiUtils.sendApiSuccess(res, { deleted: true })
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.permDelete = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const success = await Models.Ticket.deleteOne({ _id: id })
    if (!success) return apiUtils.sendApiError(res, 400, 'Unable to delete ticket')

    return apiUtils.sendApiSuccess(res, { deleted: true })
  } catch (err) {
    return apiUtils.sendApiError(res, 400, err.message)
  }
}

ticketsV2.transferToThirdParty = async (req, res) => {
  const uid = req.params.uid
  if (!uid) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const ticket = await Models.Ticket.findOne({ uid })
    if (!ticket) return apiUtils.sendApiError(res, 400, 'Ticket not found')

    ticket.status = 3
    await ticket.save()

    const request = require('axios')
    const nconf = require('nconf')
    const thirdParty = nconf.get('thirdParty')
    const url = thirdParty.url + '/api/v2/tickets'

    const ticketObj = {
      subject: ticket.subject,
      description: ticket.issue,
      email: ticket.owner.email,
      status: 2,
      priority: 2
    }

    await request.post(url, ticketObj, { auth: { username: thirdParty.apikey, password: '1' } })
    return apiUtils.sendApiSuccess(res)
  } catch (error) {
    return apiUtils.sendApiError(res, 500, error.message)
  }
}

ticketsV2.info = {}
ticketsV2.info.types = async (req, res) => {
  try {
    const ticketTypes = await Models.TicketType.find({})
    const priorities = await Models.Priority.find({})

    return apiUtils.sendApiSuccess(res, { ticketTypes, priorities })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.info.tags = async (req, res) => {
  try {
    const tags = await Models.TicketTags.find({}).sort('normalized')

    return apiUtils.sendApiSuccess(res, { tags })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.deadline = async function (req, res) {
  const uid = req.params.uid
  if (!uid) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    if (!ticket.dueDate) {
      return apiUtils.sendApiSuccess(res, { uid: ticket.uid, deadline: null })
    }

    const deadline = getDeadlineStatus(ticket.dueDate)
    return apiUtils.sendApiSuccess(res, {
      uid: ticket.uid,
      dueDate: ticket.dueDate,
      deadline
    })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.overdue = async function (req, res) {
  try {
    const tickets = await Models.Ticket.find({ deleted: false, dueDate: { $lt: new Date() } })
      .populate('owner assignee', 'username fullname email role image title')
      .populate('type tags status group')
      .sort({ dueDate: 1 })
      .lean()
      .exec()

    const ticketsWithStatus = tickets.map(function (t) {
      return Object.assign({}, t, { deadline: getDeadlineStatus(t.dueDate) })
    })

    return apiUtils.sendApiSuccess(res, { tickets: ticketsWithStatus, count: ticketsWithStatus.length })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.checklist = {}

ticketsV2.checklist.add = async function (req, res) {
  const uid = req.params.uid
  const title = req.body.title
  if (!uid || !title) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    ticket.checklist.push({ title })
    ticket.updated = new Date()

    const historyItem = {
      action: 'ticket:checklist:add',
      description: 'Checklist item added: ' + title,
      owner: req.user._id
    }
    ticket.history.push(historyItem)

    await ticket.save()

    return apiUtils.sendApiSuccess(res, { ticket })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.checklist.update = async function (req, res) {
  const uid = req.params.uid
  const itemId = req.params.itemId
  if (!uid || !itemId) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    const item = ticket.checklist.id(itemId)
    if (!item) return apiUtils.sendApiError(res, 404, 'Checklist item not found')

    if (!_.isUndefined(req.body.title)) {
      item.title = req.body.title
    }

    if (!_.isUndefined(req.body.completed)) {
      item.completed = req.body.completed
      if (req.body.completed) {
        item.completedBy = req.user._id
        item.completedAt = new Date()
      } else {
        item.completedBy = undefined
        item.completedAt = undefined
      }
    }

    ticket.updated = new Date()

    const historyItem = {
      action: 'ticket:checklist:update',
      description: 'Checklist item updated: ' + item.title,
      owner: req.user._id
    }
    ticket.history.push(historyItem)

    await ticket.save()

    return apiUtils.sendApiSuccess(res, { ticket })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.checklist.remove = async function (req, res) {
  const uid = req.params.uid
  const itemId = req.params.itemId
  if (!uid || !itemId) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    const item = ticket.checklist.id(itemId)
    if (!item) return apiUtils.sendApiError(res, 404, 'Checklist item not found')

    item.deleteOne()
    ticket.updated = new Date()

    const historyItem = {
      action: 'ticket:checklist:remove',
      description: 'Checklist item removed: ' + item.title,
      owner: req.user._id
    }
    ticket.history.push(historyItem)

    await ticket.save()

    return apiUtils.sendApiSuccess(res, { ticket })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

module.exports = ticketsV2
