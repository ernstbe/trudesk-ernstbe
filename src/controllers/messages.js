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
const conversationSchema = require('../models/chat/conversation')
const messageSchema = require('../models/chat/message')
const messagesController = {}

messagesController.content = {}

messagesController.view = (req, res) => {
  const content = {}
  content.title = 'Nachrichten'
  content.nav = 'messages'
  content.data = {}
  content.data.common = req.viewdata
  if (req.params.convoid) content.data.conversationId = req.params.convoid

  return res.render('messages', content)
}

messagesController.get = async function (req, res) {
  const content = {}
  content.title = 'Nachrichten'
  content.nav = 'messages'
  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.conversations = []
  content.data.showNewConvo = req.showNewConvo

  try {
    const convos = await conversationSchema.getConversationsWithLimit(req.user._id, undefined)

    for (let i = 0; i < convos.length; i++) {
      const convo = convos[i]
      const c = convo.toObject()

      const userMeta =
        convo.userMeta[
          _.findIndex(convo.userMeta, function (item) {
            return item.userId.toString() === req.user._id.toString()
          })
        ]
      if (!_.isUndefined(userMeta) && !_.isUndefined(userMeta.deletedAt) && userMeta.deletedAt > convo.updatedAt) {
        continue
      }

      const rm = await messageSchema.getMostRecentMessage(c._id)
      const recentMsg = _.first(rm)

      _.each(c.participants, function (p) {
        if (p._id.toString() !== req.user._id.toString()) {
          c.partner = p
        }
      })

      if (!_.isUndefined(recentMsg)) {
        if (String(c.partner._id) === String(recentMsg.owner._id)) {
          c.recentMessage = c.partner.fullname + ': ' + recentMsg.body
        } else {
          c.recentMessage = 'Du: ' + recentMsg.body
        }
      } else {
        c.recentMessage = 'Neue Unterhaltung'
      }

      content.data.conversations.push(c)
    }

    return res.render('messages', content)
  } catch (err) {
    winston.warn(err)
    return res.status(500).render('error', { layout: false, error: err, message: err.message })
  }
}

messagesController.getConversation = async function (req, res) {
  const cid = req.params.convoid
  if (_.isUndefined(cid)) {
    return res.status(400).render('error', { layout: false, error: 'Invalid Conversation ID!', message: 'Invalid Conversation ID!' })
  }

  const content = {}
  content.title = 'Nachrichten'
  content.nav = 'messages'
  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.conversations = []

  try {
    const convos = await conversationSchema.getConversationsWithLimit(req.user._id, undefined)

    for (let i = 0; i < convos.length; i++) {
      const convo = convos[i]
      const userMeta =
        convo.userMeta[
          _.findIndex(convo.userMeta, function (item) {
            return item.userId.toString() === req.user._id.toString()
          })
        ]
      if (
        !_.isUndefined(userMeta) &&
        !_.isUndefined(userMeta.deletedAt) &&
        userMeta.deletedAt > convo.updatedAt &&
        req.params.convoid.toString() !== convo._id.toString()
      ) {
        continue
      }

      const c = convo.toObject()
      const rm = await messageSchema.getMostRecentMessage(c._id)
      const recentMsg = _.first(rm)

      _.each(c.participants, function (p) {
        if (p._id.toString() !== req.user._id.toString()) {
          c.partner = p
        }
      })

      if (!_.isUndefined(recentMsg)) {
        if (String(c.partner._id) === String(recentMsg.owner._id)) {
          c.recentMessage = c.partner.fullname + ': ' + recentMsg.body
        } else {
          c.recentMessage = 'Du: ' + recentMsg.body
        }
      } else {
        c.recentMessage = 'Neue Unterhaltung'
      }

      if (
        !_.isUndefined(userMeta) &&
        !_.isUndefined(userMeta.deletedAt) &&
        !_.isUndefined(recentMsg) &&
        recentMsg.createdAt < userMeta.deletedAt
      ) {
        c.recentMessage = 'Neue Unterhaltung'
      }

      content.data.conversations.push(c)
    }

    const convo = await conversationSchema.getConversation(cid)
    if (convo === null || convo === undefined) {
      return res.redirect('/messages')
    }

    const c = convo.toObject()

    let isPart = false
    _.each(c.participants, function (p) {
      if (p._id.toString() === req.user._id.toString()) isPart = true
    })

    if (!isPart) {
      return res.redirect('/messages')
    }

    const messages = await messageSchema.getConversationWithObject({
      cid: c._id,
      userMeta: convo.userMeta,
      requestingUser: req.user
    })

    _.each(c.participants, function (p) {
      if (p._id.toString() !== req.user._id.toString()) {
        c.partner = p
      }
    })

    c.requestingUserMeta =
      convo.userMeta[
        _.findIndex(convo.userMeta, function (item) {
          return item.userId.toString() === req.user._id.toString()
        })
      ]

    content.data.page = 2
    content.data.conversation = c
    content.data.conversation.messages = messages.reverse()

    return res.render('messages', content)
  } catch (err) {
    winston.warn(err)
    return res.status(500).render('error', { layout: false, error: err, message: err.message })
  }
}

module.exports = messagesController
