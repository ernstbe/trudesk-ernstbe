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

const dayjs = require('../helpers/dayjs')

const ticketSchema = require('../models/ticket')

const init = async function (tickets, timespan, callback) {
  let tags = []
  let $tickets = []
  if (timespan === undefined || Number.isNaN(timespan) || timespan === 0) timespan = 365

  let today = dayjs()
    .hour(23)
    .minute(59)
    .second(59)
  const tsDate = today
    .subtract(timespan, 'd')
    .toDate()
    .getTime()
  today = today.toDate().getTime()

  try {
    if (tickets) {
      $tickets = await ticketSchema.populate(tickets, { path: 'tags' })
    } else {
      const fetchedTickets = await ticketSchema.getForCache()
      $tickets = await ticketSchema.populate(fetchedTickets, { path: 'tags' })
    }

    let t = []

    $tickets = $tickets.filter(function (v) {
      return v.date < today && v.date > tsDate
    })

    for (let i = 0; i < $tickets.length; i++) {
      tickets[i].tags.forEach(function (tag) {
        t.push(tag.name)
      })
    }

    const initCounts = {}
    t.forEach(function (key) { initCounts[key] = 0 })
    tags = t.reduce(
      function (counts, key) {
        counts[key]++
        return counts
      },
      initCounts
    )

    const sortedPairs = Object.entries(tags).sort(function (a, b) {
      return b[1] - a[1]
    })
    tags = Object.fromEntries(sortedPairs)

    t = null
    $tickets = null // clear it

    return callback(null, tags)
  } catch (err) {
    return callback(err)
  }
}

module.exports = init
