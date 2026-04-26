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

const xss = require('xss')
const marked = require('marked')
const sanitizeHtml = require('sanitize-html')
const emitter = require('../../../emitter')
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
  if (!Array.isArray(batch)) return apiUtils.sendApiError_InvalidPostData(res)

  const results = { success: 0, failed: 0, errors: [] }

  await Promise.allSettled(batch.map(async (batchTicket) => {
    try {
      const ticket = await Models.Ticket.getTicketById(batchTicket.id)

      if (batchTicket.status !== undefined) {
        ticket.status = batchTicket.status
        ticket.history.push({
          action: 'ticket:set:status',
          description: 'status set to: ' + batchTicket.status,
          owner: req.user._id
        })
      }

      if (batchTicket.assignee !== undefined) {
        ticket.assignee = batchTicket.assignee || undefined
        ticket.history.push({
          action: 'ticket:set:assignee',
          description: 'assignee set to: ' + (batchTicket.assignee || 'unassigned'),
          owner: req.user._id
        })
      }

      if (batchTicket.priority !== undefined) {
        ticket.priority = batchTicket.priority
        ticket.history.push({
          action: 'ticket:set:priority',
          description: 'priority set to: ' + batchTicket.priority,
          owner: req.user._id
        })
      }

      await ticket.save()
      results.success++
    } catch (err) {
      results.failed++
      results.errors.push({ id: batchTicket.id, error: err.message })
    }
  }))

  return apiUtils.sendApiSuccess(res, results)
}

ticketsV2.updateMetadata = async function (req, res) {
  const uid = req.params.uid
  const metadata = req.body.metadata
  if (!uid || !metadata || !(typeof metadata === 'object' && metadata !== null)) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')

  const allowedFields = ['estimatedCost', 'actualCost', 'vendor', 'orderNumber', 'approvedBy', 'approvalDate']

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    if (!ticket.metadata) ticket.metadata = {}

    for (let i = 0; i < allowedFields.length; i++) {
      const field = allowedFields[i]
      if (metadata[field] !== undefined) {
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

ticketsV2.info.statuses = async (req, res) => {
  try {
    const statuses = await ticketStatusSchema.find({})
    statuses.sort((a, b) => (a.order || 0) - (b.order || 0))

    return apiUtils.sendApiSuccess(res, { status: statuses })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

ticketsV2.info.priorities = async (req, res) => {
  try {
    const priorities = await Models.Priority.find({})
    priorities.sort((a, b) => (a.migrationNum || 0) - (b.migrationNum || 0) || (a.name || '').localeCompare(b.name || ''))

    return apiUtils.sendApiSuccess(res, { priorities })
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

    if (req.body.title !== undefined) {
      item.title = req.body.title
    }

    if (req.body.completed !== undefined) {
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

// -------------------------------------------------------------------
// Comments — POST /api/v2/tickets/:uid/comments
// Port of v1 apiTickets.postComment. Differences:
//   - uses :uid in the path instead of an _id in the body
//   - returns the v2-standard { success, data } shape via apiUtils
// -------------------------------------------------------------------
ticketsV2.postComment = async function (req, res) {
  const uid = req.params.uid
  const body = req.body || {}
  if (!uid) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')
  if (body.comment === undefined) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    marked.setOptions({ breaks: true })
    const comment = sanitizeHtml(body.comment).trim()

    const commentDoc = {
      owner: body.ownerId || req.user._id,
      date: new Date(),
      comment: xss(marked.parse(comment))
    }

    ticket.updated = Date.now()
    ticket.comments.push(commentDoc)
    ticket.history.push({
      action: 'ticket:comment:added',
      description: 'Comment was added',
      owner: commentDoc.owner
    })

    const saved = await ticket.save()
    if (!permissions.canThis(req.user.role, 'tickets:notes')) saved.notes = []

    emitter.emit('ticket:comment:added', saved, commentDoc, req.headers.host)
    return apiUtils.sendApiSuccess(res, { ticket: saved })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

// -------------------------------------------------------------------
// Notes — POST /api/v2/tickets/:uid/notes
// -------------------------------------------------------------------
ticketsV2.postNote = async function (req, res) {
  const uid = req.params.uid
  const body = req.body || {}
  if (!uid) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')
  if (body.note === undefined) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    const noteDoc = {
      owner: body.ownerId || req.user._id,
      date: new Date(),
      note: xss(marked.parse(body.note))
    }

    ticket.updated = Date.now()
    ticket.notes.push(noteDoc)
    ticket.history.push({
      action: 'ticket:note:added',
      description: 'Internal note was added',
      owner: noteDoc.owner
    })

    let saved = await ticket.save()
    try {
      saved = await Models.Ticket.populate(saved, 'subscribers notes.owner history.owner')
    } catch (_popErr) {
      // best effort — return the saved ticket even if populate fails
    }

    emitter.emit('ticket:note:added', saved, noteDoc)
    return apiUtils.sendApiSuccess(res, { ticket: saved })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

// -------------------------------------------------------------------
// Subscribe — PUT /api/v2/tickets/:uid/subscribe
// Body: { subscribe: true|false }. The authenticated user is the subscriber.
// Simpler than v1, which required passing the user id in the body.
// -------------------------------------------------------------------
ticketsV2.subscribe = async function (req, res) {
  const uid = req.params.uid
  const subscribe = req.body ? req.body.subscribe : undefined
  if (!uid) return apiUtils.sendApiError(res, 400, 'Invalid Parameters')
  if (subscribe === undefined) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    const ticket = await Models.Ticket.getTicketByUid(uid)
    if (!ticket) return apiUtils.sendApiError(res, 404, 'Ticket not found')

    if (subscribe) {
      await ticket.addSubscriber(req.user._id)
    } else {
      await ticket.removeSubscriber(req.user._id)
    }

    const saved = await ticket.save()
    emitter.emit('ticket:subscriber:update', saved)
    return apiUtils.sendApiSuccess(res, { ticket: saved })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

// -------------------------------------------------------------------
// Stats — GET /api/v2/tickets/stats(/:timespan)
// Reads the same global cache keys the v1 endpoint uses.
// -------------------------------------------------------------------
ticketsV2.getStats = async function (req, res) {
  const cache = global.cache
  if (cache === undefined) return apiUtils.sendApiError(res, 503, 'Ticket stats are still loading')

  let timespan = 30
  if (req.params.timespan) {
    const parsed = parseInt(req.params.timespan, 10)
    if (!Number.isNaN(parsed)) timespan = parsed
  }

  const validSpans = new Set([30, 60, 90, 180, 365])
  if (!validSpans.has(timespan)) return apiUtils.sendApiError(res, 400, 'Invalid timespan (allowed: 30, 60, 90, 180, 365)')

  const key = `tickets:overview:e${timespan}`
  const data = {
    timespan,
    graphData: cache.get(`${key}:graphData`),
    ticketCount: cache.get(`${key}:ticketCount`),
    closedCount: cache.get(`${key}:closedTickets`),
    ticketAvg: cache.get(`${key}:responseTime`),
    mostRequester: cache.get('quickstats:mostRequester'),
    mostCommenter: cache.get('quickstats:mostCommenter'),
    mostAssignee: cache.get('quickstats:mostAssignee'),
    mostActiveTicket: cache.get('quickstats:mostActiveTicket'),
    lastUpdated: cache.get('tickets:overview:lastUpdated')
  }

  return apiUtils.sendApiSuccess(res, data)
}

// -------------------------------------------------------------------
// Stats per group — GET /api/v2/tickets/stats/group/:group
// -------------------------------------------------------------------
ticketsV2.getGroupStats = async function (req, res) {
  const groupId = req.params.group
  if (!groupId) return apiUtils.sendApiError(res, 400, 'Invalid Group Id')

  try {
    const tickets = await Models.Ticket.getTicketsWithObject([groupId], { limit: 10000, page: 0 })
    if (!tickets || tickets.length === 0) return apiUtils.sendApiError(res, 404, 'Group has no tickets to report')

    const closed = tickets.filter(t => t.status === 3)
    return apiUtils.sendApiSuccess(res, {
      ticketCount: tickets.length,
      closedCount: closed.length,
      recentTickets: [...tickets].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-5)
    })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

// -------------------------------------------------------------------
// Stats per user — GET /api/v2/tickets/stats/user/:user
// -------------------------------------------------------------------
ticketsV2.getUserStats = async function (req, res) {
  const userId = req.params.user
  if (!userId) return apiUtils.sendApiError(res, 400, 'Invalid User Id')

  try {
    const tickets = await Models.Ticket.getTicketsByRequester(userId)
    if (!tickets || tickets.length === 0) return apiUtils.sendApiError(res, 404, 'User has no tickets to report')

    const closed = tickets.filter(t => t.status === 3)
    return apiUtils.sendApiSuccess(res, {
      ticketCount: tickets.length,
      closedCount: closed.length,
      recentTickets: [...tickets].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-5)
    })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

// -------------------------------------------------------------------
// Batch delete — DELETE /api/v2/tickets/batch
// Body: { ids: ["<mongo _id>", ...] }. Soft-deletes each; returns a
// success/failed summary mirroring batchUpdate.
// -------------------------------------------------------------------
ticketsV2.batchDelete = async function (req, res) {
  const ids = req.body ? req.body.ids : undefined
  if (!Array.isArray(ids) || ids.length === 0) return apiUtils.sendApiError_InvalidPostData(res)

  // NB: don't use `success` as the inner counter key — apiUtils.sendApiSuccess
  // already sets { success: true } at the top level and would collide.
  const results = { deleted: 0, failed: 0, errors: [] }

  await Promise.allSettled(ids.map(async (id) => {
    try {
      const ticket = await Models.Ticket.getTicketById(id)
      if (!ticket) throw new Error('Ticket not found')
      ticket.deleted = true
      ticket.updated = new Date()
      ticket.history.push({
        action: 'ticket:deleted',
        description: 'Ticket batch-deleted',
        owner: req.user._id
      })
      await ticket.save()
      results.deleted++
    } catch (err) {
      results.failed++
      results.errors.push({ id, error: err.message })
    }
  }))

  return apiUtils.sendApiSuccess(res, results)
}

module.exports = ticketsV2
