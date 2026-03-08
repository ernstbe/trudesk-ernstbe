/*
      .                              .o8                     oooo
   .o8                             "888                     `888
 .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
   888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
   888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
   888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
   "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 ========================================================================
*/

const _ = require('lodash')
const async = require('async')
const axios = require('axios')
const cron = require('node-cron')
const winston = require('../logger')
const ticketSchema = require('../models/ticket')
const userSchema = require('../models/user')
const groupSchema = require('../models/group')
const conversationSchema = require('../models/chat/conversation')
const settingSchema = require('../models/setting')
const RecurringTask = require('../models/recurringTask')
const StatusSchema = require('../models/ticketStatus')
const sanitizeHtml = require('sanitize-html')

const taskRunner = {}

taskRunner.init = function (callback) {
  // Run recurring tasks check every 5 minutes
  cron.schedule('*/5 * * * *', function () {
    taskRunner.processRecurringTasks()
  })

  winston.debug('TaskRunner: Recurring tasks cron scheduled (every 5 minutes)')

  return callback()
}

taskRunner.processRecurringTasks = async function () {
  try {
    var tasks = await RecurringTask.getEnabled()
    var now = new Date()

    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i]

      if (!task.nextRun || task.nextRun > now) continue

      try {
        await taskRunner.createTicketFromRecurringTask(task)

        task.lastRun = now
        task.nextRun = RecurringTask.calculateNextRun(task)
        await task.save()

        winston.info('TaskRunner: Created ticket from recurring task "' + task.name + '", next run: ' + task.nextRun)
      } catch (err) {
        winston.warn('TaskRunner: Failed to process recurring task "' + task.name + '" — ' + err.message)
      }
    }
  } catch (err) {
    winston.warn('TaskRunner: Error fetching recurring tasks — ' + err.message)
  }
}

taskRunner.createTicketFromRecurringTask = async function (task) {
  var defaultStatus = await StatusSchema.findOne({ isResolved: false }).sort({ order: 1 })
  if (!defaultStatus) throw new Error('No open status found')

  var historyItem = {
    action: 'ticket:created',
    description: 'Ticket automatically created from recurring task: ' + task.name,
    owner: task.createdBy
  }

  var ticketData = {
    owner: task.createdBy,
    group: task.ticketGroup,
    type: task.ticketType,
    status: defaultStatus._id,
    priority: task.ticketPriority,
    subject: sanitizeHtml(task.ticketSubject).trim(),
    issue: sanitizeHtml(task.ticketIssue).trim(),
    tags: task.ticketTags || [],
    history: [historyItem],
    subscribers: [task.createdBy]
  }

  if (task.ticketAssignee) {
    ticketData.assignee = task.ticketAssignee
  }

  var ticket = new ticketSchema(ticketData)
  var saved = await ticket.save()
  await saved.populate('group owner priority')

  var emitter = require('../emitter')
  emitter.emit('ticket:created', { ticket: saved })

  return saved
}

taskRunner.sendStats = function (callback) {
  settingSchema.getSettingsByName(['gen:installid', 'gen:version', 'gen:siteurl'], function (err, settings) {
    if (err) return callback(err)
    if (!settings || settings.length < 1) return callback()

    let versionSetting = _.find(settings, function (x) {
      return x.name === 'gen:version'
    })
    const installIdSetting = _.find(settings, function (x) {
      return x.name === 'gen:installid'
    })

    let hostnameSetting = _.find(settings, function (x) {
      return x.name === 'gen:siteurl'
    })

    if (!installIdSetting) return callback()

    versionSetting = _.isUndefined(versionSetting) ? { value: '--' } : versionSetting

    hostnameSetting = _.isUndefined(hostnameSetting) ? { value: '--' } : hostnameSetting

    const result = {
      ticketCount: 0,
      agentCount: 0,
      customerGroupCount: 0,
      conversationCount: 0
    }

    async.parallel(
      [
        async function (done) {
          try {
            const count = await ticketSchema.countDocuments({ deleted: false })
            result.ticketCount = count
            return done()
          } catch (err) {
            return done(err)
          }
        },
        function (done) {
          userSchema.getAgents({}, function (err, agents) {
            if (err) return done(err)

            if (!agents) return done()
            result.agentCount = agents.length

            return done()
          })
        },
        async function (done) {
          try {
            const count = await groupSchema.countDocuments({})
            result.customerGroupCount = count
            return done()
          } catch (err) {
            return done(err)
          }
        },
        async function (done) {
          try {
            const count = await conversationSchema.countDocuments({})
            result.conversationCount = count
            return done()
          } catch (err) {
            return done(err)
          }
        }
      ],
      function (err) {
        // if (typeof callback === 'function') return callback()
        // return
        if (err) return callback()
        axios
          .post('https://stats.trudesk.app/api/v1/installation', {
            statsKey: 'trudesk',
            id: installIdSetting.value,
            version: versionSetting.value,
            hostname: hostnameSetting.value,
            ticketCount: result.ticketCount,
            agentCount: result.agentCount,
            customerGroupCount: result.customerGroupCount,
            conversationCount: result.conversationCount
          })
          .then(function () {
            callback()
          })
          .catch(function () {
            callback()
          })
      }
    )
  })
}

module.exports = taskRunner
