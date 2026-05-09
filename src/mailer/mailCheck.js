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
const Imap = require('imap')
const winston = require('../logger')
const simpleParser = require('mailparser').simpleParser
const cheerio = require('cheerio')

const emitter = require('../emitter')
const userSchema = require('../models/user')
const groupSchema = require('../models/group')
const ticketTypeSchema = require('../models/tickettype')
const statusSchema = require('../models').Status
const Ticket = require('../models/ticket')

const mailCheck = {}
mailCheck.inbox = []

mailCheck.init = function (settings) {
  const s = {}
  s.mailerCheckEnabled = settings.find(function (x) {
    return x.name === 'mailer:check:enable'
  })
  s.mailerCheckHost = settings.find(function (x) {
    return x.name === 'mailer:check:host'
  })
  s.mailerCheckPort = settings.find(function (x) {
    return x.name === 'mailer:check:port'
  })
  s.mailerCheckUsername = settings.find(function (x) {
    return x.name === 'mailer:check:username'
  })
  s.mailerCheckPassword = settings.find(function (x) {
    return x.name === 'mailer:check:password'
  })
  s.mailerCheckSelfSign = settings.find(function (x) {
    return x.name === 'mailer:check:selfsign'
  })
  s.mailerCheckPolling = settings.find(function (x) {
    return x.name === 'mailer:check:polling'
  })
  s.mailerCheckTicketType = settings.find(function (x) {
    return x.name === 'mailer:check:ticketype'
  })
  s.mailerCheckTicketPriority = settings.find(function (x) {
    return x.name === 'mailer:check:ticketpriority'
  })
  s.mailerCheckCreateAccount = settings.find(function (x) {
    return x.name === 'mailer:check:createaccount'
  })
  s.mailerCheckDeleteMessage = settings.find(function (x) {
    return x.name === 'mailer:check:deletemessage'
  })

  s.mailerCheckEnabled = s.mailerCheckEnabled === undefined ? { value: false } : s.mailerCheckEnabled
  s.mailerCheckHost = s.mailerCheckHost === undefined ? { value: '' } : s.mailerCheckHost
  s.mailerCheckPort = s.mailerCheckPort === undefined ? { value: 143 } : s.mailerCheckPort
  s.mailerCheckUsername = s.mailerCheckUsername === undefined ? { value: '' } : s.mailerCheckUsername
  s.mailerCheckPassword = s.mailerCheckPassword === undefined ? { value: '' } : s.mailerCheckPassword
  s.mailerCheckSelfSign = s.mailerCheckSelfSign === undefined ? { value: false } : s.mailerCheckSelfSign
  s.mailerCheckPolling = s.mailerCheckPolling === undefined ? { value: 600000 } : s.mailerCheckPolling // 10 min
  s.mailerCheckTicketType = s.mailerCheckTicketType === undefined ? { value: 'Issue' } : s.mailerCheckTicketType
  s.mailerCheckTicketPriority = s.mailerCheckTicketPriority === undefined ? { value: '' } : s.mailerCheckTicketPriority
  s.mailerCheckCreateAccount = s.mailerCheckCreateAccount === undefined ? { value: false } : s.mailerCheckCreateAccount
  s.mailerCheckDeleteMessage = s.mailerCheckDeleteMessage === undefined ? { value: false } : s.mailerCheckDeleteMessage

  const MAILERCHECK_ENABLED = s.mailerCheckEnabled.value
  const MAILERCHECK_HOST = s.mailerCheckHost.value
  const MAILERCHECK_USER = s.mailerCheckUsername.value
  const MAILERCHECK_PASS = s.mailerCheckPassword.value
  const MAILERCHECK_PORT = s.mailerCheckPort.value
  const MAILERCHECK_TLS = s.mailerCheckPort.value === '993'
  const MAILERCHECK_SELFSIGN = s.mailerCheckSelfSign.value
  const POLLING_INTERVAL = s.mailerCheckPolling.value

  if (!MAILERCHECK_ENABLED) return true

  let tlsOptions = {}
  if (MAILERCHECK_SELFSIGN) tlsOptions = { rejectUnauthorized: false }

  mailCheck.Imap = new Imap({
    user: MAILERCHECK_USER,
    password: MAILERCHECK_PASS,
    host: MAILERCHECK_HOST,
    port: MAILERCHECK_PORT,
    tls: MAILERCHECK_TLS,
    tlsOptions
  })

  mailCheck.fetchMailOptions = {
    defaultTicketType: s.mailerCheckTicketType.value,
    defaultPriority: s.mailerCheckTicketPriority.value,
    createAccount: s.mailerCheckCreateAccount.value,
    deleteMessage: s.mailerCheckDeleteMessage.value
  }

  mailCheck.messages = []

  bindImapError()
  bindImapReady()

  mailCheck.fetchMail()
  mailCheck.checkTimer = setInterval(function () {
    mailCheck.fetchMail()
  }, POLLING_INTERVAL)
}

mailCheck.refetch = function () {
  if (mailCheck.fetchMailOptions === undefined) {
    winston.warn('Mailcheck.refetch() running before Mailcheck.init(); please run Mailcheck.init() prior')
    return
  }

  mailCheck.fetchMail()
}

function bindImapError () {
  mailCheck.Imap.on('error', function (err) {
    winston.error(err)
  })
}

function bindImapReady () {
  try {
    mailCheck.Imap.on('ready', function () {
      openInbox(function (err) {
        if (err) {
          mailCheck.Imap.end()
          winston.debug(err)
        } else {
          async.waterfall(
            [
              function (next) {
                mailCheck.Imap.search(['UNSEEN'], next)
              },
              function (results, next) {
                if (results.length < 1) {
                  winston.debug('MailCheck: Nothing to Fetch.')
                  return next()
                }

                winston.debug('Processing %s Mail', results.length)

                let flag = '\\Seen'
                if (mailCheck.fetchMailOptions.deleteMessage) {
                  flag = '\\Deleted'
                }

                const f = mailCheck.Imap.fetch(results, {
                  bodies: ''
                })

                f.on('message', function (msg) {
                  msg.on('body', function (stream) {
                    const message = {}
                    let buffer = ''
                    stream.on('data', function (chunk) {
                      buffer += chunk.toString('utf8')
                    })

                    stream.once('end', function () {
                      simpleParser(buffer, function (err, mail) {
                        if (err) winston.warn(err)

                        if (mail.headers.has('from')) {
                          message.from = mail.headers.get('from').value[0].address
                        }

                        if (mail.subject) {
                          message.subject = mail.subject
                        } else {
                          message.subject = message.from
                        }

                        if (mail.textAsHtml === undefined) {
                          const $ = cheerio.load(mail.html)
                          const $body = $('body')
                          message.body = $body.length > 0 ? $body.html() : mail.html
                        } else {
                          message.body = mail.textAsHtml
                        }

                        mailCheck.messages.push(message)
                      })
                    })
                  })
                })

                f.on('end', function () {
                  mailCheck.Imap.addFlags(results, flag, function () {
                    mailCheck.Imap.closeBox(true, function () {
                      mailCheck.Imap.end()
                      handleMessages(mailCheck.messages, function () {
                        mailCheck.Imap.destroy()
                      })
                    })
                  })
                })
              }
            ],
            function (err) {
              if (err) winston.warn(err)
              mailCheck.Imap.end()
            }
          )
        }
      })
    })
  } catch (error) {
    winston.warn(error)
    mailCheck.Imap.end()
  }
}

mailCheck.fetchMail = function () {
  try {
    mailCheck.messages = []
    mailCheck.Imap.connect()
  } catch (err) {
    mailCheck.Imap.end()
    winston.warn(err)
  }
}

async function processMessage (message) {
  // Resolve owner: existing user or auto-create one if configured.
  let user = await userSchema.getUserByEmail(message.from)
  if (!user) {
    if (!mailCheck.fetchMailOptions.createAccount) {
      throw new Error('No User found.')
    }
    const response = await userSchema.createUserFromEmail(message.from)
    user = response.user
    message.group = response.group
  }
  message.owner = user

  // Resolve group: use the user's first group, or auto-create a personal one.
  if (!message.group) {
    const groups = await groupSchema.getAllGroupsOfUser(message.owner._id)
    let group = Array.isArray(groups) ? groups[0] : groups
    if (!group) {
      group = await groupSchema.create({
        name: message.owner.email,
        members: [message.owner._id],
        sendMailTo: [message.owner._id],
        public: true
      })
    }
    message.group = group
  }

  // Resolve ticket type: lazy-resolve "Issue" name to its _id, then cache the _id on options.
  let type
  if (mailCheck.fetchMailOptions.defaultTicketType === 'Issue') {
    type = await ticketTypeSchema.getTypeByName('Issue')
    if (!type) throw new Error('Invalid default ticket type: Issue')
    mailCheck.fetchMailOptions.defaultTicketType = type._id
  } else {
    type = await ticketTypeSchema.getType(mailCheck.fetchMailOptions.defaultTicketType)
    if (!type) throw new Error('Invalid default ticket type')
  }
  message.type = type

  // Resolve priority: use configured default, otherwise first priority of the type.
  let priorityId = mailCheck.fetchMailOptions.defaultPriority
  if (!priorityId) {
    const firstPriority = type.priorities && type.priorities[0]
    if (!firstPriority) throw new Error('Invalid default priority')
    priorityId = firstPriority._id
    mailCheck.fetchMailOptions.defaultPriority = priorityId
  }

  // Resolve status: first status by sort order.
  const statuses = await statusSchema.getStatus()
  const status = statuses && statuses[0]
  if (!status) throw new Error('Invalid status')
  message.status = status._id

  // Create the ticket.
  const HistoryItem = {
    action: 'ticket:created',
    description: 'Ticket was created.',
    owner: message.owner._id
  }

  const ticket = await Ticket.create({
    owner: message.owner._id,
    group: message.group._id,
    type: message.type._id,
    status: message.status,
    priority: priorityId,
    subject: message.subject,
    issue: message.body,
    history: [HistoryItem]
  })

  emitter.emit('ticket:created', { socketId: '', ticket })
  return ticket
}

async function handleMessages (messages, done) {
  let count = 0
  let firstErr = null

  for (const message of messages) {
    if (
      !message.from || !message.from.length ||
      !message.subject || !message.subject.length ||
      !message.body || !message.body.length
    ) continue

    try {
      await processMessage(message)
      count++
    } catch (err) {
      // Don't let one bad message abort the whole batch.
      winston.warn('Failed to create ticket from email: ' + (err && err.message ? err.message : err))
      if (!firstErr) firstErr = err
    }
  }

  winston.debug('Created %s tickets from mail', count)
  if (typeof done === 'function') return done(firstErr)
}

function openInbox (cb) {
  mailCheck.Imap.openBox('INBOX', cb)
}
module.exports = mailCheck
