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
 *  Updated:    2/14/19 12:06 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

var _ = require('lodash')
var Ticket = require('../../../models/ticket')
var StatusSchema = require('../../../models/ticketStatus')
var GroupSchema = require('../../../models/group')
var apiUtil = require('../apiUtils')

var reportsApi = {}

reportsApi.handover = async function (req, res) {
  var groupId = req.query.groupId
  if (!groupId) return apiUtil.sendApiError(res, 400, 'groupId is required')

  var format = req.query.format || 'json'

  try {
    var group = await GroupSchema.findById(groupId)
    if (!group) return apiUtil.sendApiError(res, 404, 'Group not found')

    var unresolvedStatuses = await StatusSchema.find({ isResolved: false })
    var unresolvedIds = unresolvedStatuses.map(function (s) { return s._id })

    var tickets = await Ticket.find({
      group: groupId,
      status: { $in: unresolvedIds },
      deleted: false
    })
      .populate('owner assignee type status tags priority')
      .sort({ priority: -1, date: 1 })
      .exec()

    var ticketSummaries = tickets.map(function (t) {
      var lastComment = t.comments && t.comments.length > 0 ? t.comments[t.comments.length - 1] : null
      return {
        uid: t.uid,
        subject: t.subject,
        status: t.status ? t.status.name : 'Unknown',
        priority: t.priority ? t.priority.name : 'Unknown',
        assignee: t.assignee ? t.assignee.fullname : 'Nicht zugewiesen',
        created: t.date,
        updated: t.updated,
        lastComment: lastComment ? lastComment.comment : null
      }
    })

    if (format === 'markdown') {
      var now = new Date().toISOString().split('T')[0]
      var md = '# Uebergabe-Bericht: ' + group.name + '\n'
      md += 'Erstellt am: ' + now + '\n\n'
      md += '## Offene Tickets (' + ticketSummaries.length + ')\n\n'

      if (ticketSummaries.length === 0) {
        md += 'Keine offenen Tickets.\n'
      } else {
        md += '| # | Betreff | Status | Prioritaet | Zugewiesen | Letztes Update |\n'
        md += '|---|---------|--------|------------|------------|----------------|\n'
        for (var i = 0; i < ticketSummaries.length; i++) {
          var t = ticketSummaries[i]
          var updated = t.updated ? new Date(t.updated).toISOString().split('T')[0] : '-'
          md += '| ' + t.uid + ' | ' + t.subject + ' | ' + t.status + ' | ' + t.priority + ' | ' + t.assignee + ' | ' + updated + ' |\n'
        }
      }

      return apiUtil.sendApiSuccess(res, { group: group.name, count: ticketSummaries.length, markdown: md })
    }

    return apiUtil.sendApiSuccess(res, { group: group.name, tickets: ticketSummaries })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

reportsApi.sitzung = async function (req, res) {
  var since = req.query.since
  if (!since) return apiUtil.sendApiError(res, 400, 'since (ISO date) is required')

  var sinceDate = new Date(since)
  if (isNaN(sinceDate.getTime())) return apiUtil.sendApiError(res, 400, 'Invalid date format')

  var format = req.query.format || 'json'

  try {
    var populateFields = 'owner assignee type status tags group priority'

    var openedTickets = await Ticket.find({
      date: { $gte: sinceDate },
      deleted: false
    })
      .populate(populateFields)
      .sort({ date: -1 })
      .exec()

    var closedTickets = await Ticket.find({
      closedDate: { $gte: sinceDate },
      deleted: false
    })
      .populate(populateFields)
      .sort({ closedDate: -1 })
      .exec()

    var openedByGroup = _.groupBy(openedTickets, function (t) {
      return t.group ? t.group.name : 'Ohne Gruppe'
    })
    var closedByGroup = _.groupBy(closedTickets, function (t) {
      return t.group ? t.group.name : 'Ohne Gruppe'
    })

    function ticketToSummary (t) {
      return {
        uid: t.uid,
        subject: t.subject,
        type: t.type ? t.type.name : '-',
        status: t.status ? t.status.name : '-',
        priority: t.priority ? t.priority.name : '-',
        assignee: t.assignee ? t.assignee.fullname : 'Nicht zugewiesen',
        created: t.date,
        closed: t.closedDate
      }
    }

    var openedGrouped = {}
    for (var gName in openedByGroup) {
      openedGrouped[gName] = openedByGroup[gName].map(ticketToSummary)
    }
    var closedGrouped = {}
    for (var cName in closedByGroup) {
      closedGrouped[cName] = closedByGroup[cName].map(ticketToSummary)
    }

    var result = {
      since: sinceDate,
      generatedAt: new Date(),
      summary: {
        totalOpened: openedTickets.length,
        totalClosed: closedTickets.length
      },
      opened: openedGrouped,
      closed: closedGrouped
    }

    if (format === 'markdown') {
      var now = new Date().toISOString().split('T')[0]
      var sinceStr = sinceDate.toISOString().split('T')[0]
      var md = '# OV-Sitzungs-Bericht\n'
      md += 'Zeitraum: ' + sinceStr + ' bis ' + now + '\n\n'
      md += '## Zusammenfassung\n'
      md += '- Neue Tickets: ' + openedTickets.length + '\n'
      md += '- Geschlossene Tickets: ' + closedTickets.length + '\n\n'

      md += '## Neue Tickets\n\n'
      for (var oGroup in openedGrouped) {
        md += '### ' + oGroup + ' (' + openedGrouped[oGroup].length + ')\n\n'
        md += '| # | Betreff | Typ | Prioritaet | Status | Zugewiesen |\n'
        md += '|---|---------|-----|------------|--------|------------|\n'
        for (var oi = 0; oi < openedGrouped[oGroup].length; oi++) {
          var ot = openedGrouped[oGroup][oi]
          md += '| ' + ot.uid + ' | ' + ot.subject + ' | ' + ot.type + ' | ' + ot.priority + ' | ' + ot.status + ' | ' + ot.assignee + ' |\n'
        }
        md += '\n'
      }

      md += '## Geschlossene Tickets\n\n'
      for (var cGroup in closedGrouped) {
        md += '### ' + cGroup + ' (' + closedGrouped[cGroup].length + ')\n\n'
        md += '| # | Betreff | Typ | Prioritaet | Zugewiesen |\n'
        md += '|---|---------|-----|------------|------------|\n'
        for (var ci = 0; ci < closedGrouped[cGroup].length; ci++) {
          var ct = closedGrouped[cGroup][ci]
          md += '| ' + ct.uid + ' | ' + ct.subject + ' | ' + ct.type + ' | ' + ct.priority + ' | ' + ct.assignee + ' |\n'
        }
        md += '\n'
      }

      result.markdown = md
    }

    return apiUtil.sendApiSuccess(res, result)
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

module.exports = reportsApi
