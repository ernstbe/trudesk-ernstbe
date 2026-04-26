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

const ticketSchema = require('../models/ticket')

const init = async function (tickets, callback) {
  const obj = {}
  let $tickets = []

  try {
    if (tickets) {
      $tickets = await ticketSchema.populate(tickets, { path: 'owner comments.owner assignee' })
    } else {
      const fetchedTickets = await ticketSchema.getForCache()
      $tickets = await ticketSchema.populate(fetchedTickets, { path: 'owner comments.owner assignee' })
    }

    obj.mostRequester = buildMostRequester($tickets)[0]
    obj.mostCommenter = buildMostComments($tickets)[0]
    obj.mostAssignee = buildMostAssignee($tickets)[0]
    obj.mostActiveTicket = buildMostActiveTicket($tickets)[0]

    $tickets = null // clear it

    return callback(null, obj)
  } catch (err) {
    return callback(err)
  }
}

function buildMostRequester (ticketArray) {
  let requesters = ticketArray.map(function (m) {
    if (m.owner) {
      return m.owner.fullname
    }

    return null
  })

  requesters = requesters.filter(Boolean)

  let r = requesters.reduce((acc, k) => { acc[k] = (acc[k] || 0) + 1; return acc }, {})

  r = Object.entries(r).map(function ([k, v]) {
    return { name: k, value: v }
  })

  r = [...r].sort(function (a, b) {
    return b.value - a.value
  })

  return r
}

function flatten (arr) {
  return arr.reduce(function (flat, toFlatten) {
    return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten)
  }, [])
}

function buildMostComments (ticketArray) {
  let commenters = ticketArray.map(function (m) {
    return m.comments.map(function (i) {
      return i.owner.fullname
    })
  })

  commenters = flatten(commenters)

  let c = commenters.reduce((acc, k) => { acc[k] = (acc[k] || 0) + 1; return acc }, {})

  c = Object.entries(c).map(function ([k, v]) {
    return { name: k, value: v }
  })

  c = [...c].sort(function (a, b) {
    return b.value - a.value
  })

  return c
}

function buildMostAssignee (ticketArray) {
  ticketArray = ticketArray.filter(function (v) {
    return v.assignee !== undefined && v.assignee !== null
  })

  const assignees = ticketArray.map(function (m) {
    return m.assignee.fullname
  })

  let a = assignees.reduce((acc, k) => { acc[k] = (acc[k] || 0) + 1; return acc }, {})

  a = Object.entries(a).map(function ([k, v]) {
    return { name: k, value: v }
  })

  a = [...a].sort(function (a, b) {
    return b.value - a.value
  })

  return a
}

function buildMostActiveTicket (ticketArray) {
  let tickets = ticketArray.map(function (m) {
    return { uid: m.uid, cSize: m.history.length }
  })

  tickets = [...tickets].sort((a, b) => b.cSize - a.cSize)

  return tickets
}

module.exports = init
