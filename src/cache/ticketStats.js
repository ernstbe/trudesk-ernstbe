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

const async = require('async')
const dayjs = require('../helpers/dayjs')
const winston = require('winston')

const ticketSchema = require('../models/ticket')

const ex = {}

function buildGraphData (arr, days, callback) {
  const graphData = []
  if (arr.length < 1) {
    return callback(graphData)
  }
  const today = dayjs()
    .hour(23)
    .minute(59)
    .second(59)
  const timespanArray = []
  for (let i = days; i--;) {
    timespanArray.push(i)
  }

  arr = arr.map(function (i) {
    return dayjs(i.date).format('YYYY-MM-DD')
  })

  let counted = arr.reduce((acc, v) => { acc[v] = (acc[v] || 0) + 1; return acc }, {})

  for (let k = 0; k < timespanArray.length; k++) {
    const obj = {}
    const day = timespanArray[k]
    const d = today.clone().subtract(day, 'd')
    obj.date = d.format('YYYY-MM-DD')

    obj.value = counted[obj.date] === undefined ? 0 : counted[obj.date]

    graphData.push(obj)
  }

  counted = null

  return callback(graphData)
}

function buildAvgResponse (ticketArray, callback) {
  const cbObj = {}
  const $ticketAvg = []
  for (let i = 0; i < ticketArray.length; i++) {
    const ticket = ticketArray[i]
    if (ticket.comments === undefined || ticket.comments.length < 1) continue

    const ticketDate = dayjs(ticket.date)
    const firstCommentDate = dayjs(ticket.comments[0].date)

    const diff = firstCommentDate.diff(ticketDate, 'seconds')
    $ticketAvg.push(diff)
  }

  const ticketAvgTotal = $ticketAvg.reduce(
    function (m, x) {
      return m + x
    },
    0
  )

  const tvt = dayjs.duration(Math.round(ticketAvgTotal / $ticketAvg.length), 'seconds').asHours()
  cbObj.avgResponse = Math.floor(tvt)

  return callback(cbObj)
}

const init = function (tickets, callback) {
  let $tickets = []
  ex.e30 = {}
  ex.e60 = {}
  ex.e90 = {}
  ex.e180 = {}
  ex.e365 = {}
  ex.lifetime = {}
  ex.lastUpdated = dayjs.utc()
  const today = dayjs()
    .hour(23)
    .minute(59)
    .second(59)
  const e30 = today.clone().subtract(30, 'd')
  const e60 = today.clone().subtract(60, 'd')
  const e90 = today.clone().subtract(90, 'd')
  const e180 = today.clone().subtract(180, 'd')
  // e365 = today.clone().subtract(365, 'd');

  async.series(
    [
      function (done) {
        if (tickets) {
          $tickets = JSON.parse(JSON.stringify(tickets))

          return done()
        }

        winston.debug('No Tickets sent to cache (Pulling...)')
        ticketSchema.getForCache(function (err, tickets) {
          if (err) return done(err)

          $tickets = tickets

          return done()
        })
      },
      function (done) {
        async.series(
          {
            e365: function (c) {
              ex.e365.tickets = $tickets

              ex.e365.closedTickets = ex.e365.tickets.map(t => t.status).filter(function (v) {
                  return v === 3
                })

              buildGraphData(ex.e365.tickets, 365, function (graphData) {
                ex.e365.graphData = graphData

                // Get average Response
                buildAvgResponse(ex.e365.tickets, function (obj) {
                  ex.e365.avgResponse = obj.avgResponse
                  ex.e365.tickets = ex.e365.tickets.length
                  ex.e365.closedTickets = ex.e365.closedTickets.length

                  // Remove all tickets more than 180 days
                  const t180 = e180.toDate().getTime()
                  $tickets = $tickets.filter(function (t) {
                    return t.date > t180
                  })

                  return c()
                })
              })
            },
            e180: function (c) {
              ex.e180.tickets = $tickets

              ex.e180.closedTickets = ex.e180.tickets.map(t => t.status).filter(function (v) {
                  return v === 3
                })

              buildGraphData(ex.e180.tickets, 180, function (graphData) {
                ex.e180.graphData = graphData

                buildAvgResponse(ex.e180.tickets, function (obj) {
                  ex.e180.avgResponse = obj.avgResponse
                  ex.e180.tickets = ex.e180.tickets.length
                  ex.e180.closedTickets = ex.e180.closedTickets.length

                  // Remove all tickets more than 90 days
                  const t90 = e90.toDate().getTime()
                  $tickets = $tickets.filter(function (t) {
                    return t.date > t90
                  })

                  return c()
                })
              })
            },
            e90: function (c) {
              ex.e90.tickets = $tickets

              ex.e90.closedTickets = ex.e90.tickets.map(t => t.status).filter(function (v) {
                  return v === 3
                })

              buildGraphData(ex.e90.tickets, 90, function (graphData) {
                ex.e90.graphData = graphData

                buildAvgResponse(ex.e90.tickets, function (obj) {
                  ex.e90.avgResponse = obj.avgResponse
                  ex.e90.tickets = ex.e90.tickets.length
                  ex.e90.closedTickets = ex.e90.closedTickets.length

                  // Remove all tickets more than 60 days
                  const t60 = e60.toDate().getTime()
                  $tickets = $tickets.filter(function (t) {
                    return t.date > t60
                  })

                  return c()
                })
              })
            },
            e60: function (c) {
              ex.e60.tickets = $tickets

              ex.e60.closedTickets = ex.e60.tickets.map(t => t.status).filter(function (v) {
                  return v === 3
                })

              buildGraphData(ex.e60.tickets, 60, function (graphData) {
                ex.e60.graphData = graphData

                buildAvgResponse(ex.e60.tickets, function (obj) {
                  ex.e60.avgResponse = obj.avgResponse
                  ex.e60.tickets = ex.e60.tickets.length
                  ex.e60.closedTickets = ex.e60.closedTickets.length

                  // Remove all tickets more than 30 days
                  const t30 = e30.toDate().getTime()
                  $tickets = $tickets.filter(function (t) {
                    return t.date > t30
                  })

                  return c()
                })
              })
            },
            e30: function (c) {
              ex.e30.tickets = $tickets

              ex.e30.closedTickets = ex.e30.tickets.map(t => t.status).filter(function (v) {
                  return v === 3
                })

              buildGraphData(ex.e30.tickets, 30, function (graphData) {
                ex.e30.graphData = graphData

                buildAvgResponse(ex.e30.tickets, function (obj) {
                  ex.e30.avgResponse = obj.avgResponse
                  ex.e30.tickets = ex.e30.tickets.length
                  ex.e30.closedTickets = ex.e30.closedTickets.length

                  return c()
                })
              })
            }
          },
          function (err) {
            return done(err)
          }
        )
      }
    ],
    function (err) {
      $tickets = null
      return callback(err, ex)
    }
  )
}

module.exports = init
