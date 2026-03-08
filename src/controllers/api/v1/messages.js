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
const winston = require('../../../logger')
const ConversationSchema = require('../../../models/chat/conversation')
const MessageSchema = require('../../../models/chat/message')
const UserSchema = require('../../../models/user')

const apiMessages = {}

/**
 * @api {get} /api/v1/messages Get Messages
 * @apiName getMessages
 * @apiDescription Gets messages for the current logged in user
 * @apiVersion 0.1.8
 * @apiGroup Messages
 * @apiHeader {string} accesstoken The access token for the logged in user
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/messages
 *
 * @apiSuccess {boolean}    success             Successful?
 * @apiSuccess {array}      messages
 * @apiSuccess {object}     messages._id        The MongoDB ID
 * @apiSuccess {object}     messages.owner      Message Owner
 * @apiSuccess {object}     messages.from       Message From
 * @apiSuccess {string}     messages.subject    Message Subject
 * @apiSuccess {string}     messages.message    Message Text
 * @apiSuccess {date}       messages.date       Message Date
 * @apiSuccess {boolean}    messages.unread     Unread?
 * @apiSuccess {number}     messages.folder     Message Folder
 *
 */

apiMessages.getConversations = async function (req, res) {
  try {
    const conversations = await ConversationSchema.getConversations(req.user._id)
    return res.json({ success: true, conversations })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiMessages.getRecentConversations = async function (req, res) {
  try {
    const conversations = await ConversationSchema.getConversations(req.user._id)

    const result = []
    for (const item of conversations) {
      const idx = _.findIndex(item.userMeta, function (mItem) {
        return mItem.userId.toString() === req.user._id.toString()
      })
      if (idx === -1) {
        return res.status(400).json({ success: false, error: 'Unable to attach to userMeta' })
      }

      const m = await MessageSchema.getMostRecentMessage(item._id)
      const r = item.toObject()

      if (_.first(m) === undefined) {
        continue
      }

      if (item.userMeta[idx].deletedAt && item.userMeta[idx].deletedAt > _.first(m).createdAt) {
        continue
      }

      r.recentMessage = _.first(m)
      if (!_.isUndefined(r.recentMessage)) {
        r.recentMessage.__v = undefined
        result.push(r)
      }
    }

    return res.json({ success: true, conversations: result })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

apiMessages.get = async function (req, res) {
  try {
    const conversations = await ConversationSchema.getConversations(req.user._id)
    const fullConversations = []

    await Promise.all(
      conversations.map(async function (item) {
        const messages = await MessageSchema.getFullConversation(item._id)
        fullConversations.push({
          cId: item._id,
          p: item.participants,
          messages
        })
      })
    )

    return res.json({ success: true, conversations: fullConversations })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

apiMessages.startConversation = async function (req, res) {
  try {
    const payload = req.body
    const requester = payload.owner
    const participants = payload.participants

    // Check if Conversation with these participants exist
    const convo = await ConversationSchema.getConversations(participants)

    if (convo.length > 0) {
      const conversation = _.first(convo)
      const userMeta =
        conversation.userMeta[_.findIndex(conversation.userMeta, i => i.userId.toString() === requester.toString())]
      if (userMeta) {
        userMeta.updatedAt = Date.now()
        const updatedConvo = await conversation.save()
        return res.json({ success: true, conversation: updatedConvo })
      } else return res.json({ success: true, conversation })
    }

    if (convo.length < 1) {
      const userMeta = []
      _.each(participants, function (item) {
        const meta = {
          userId: item,
          joinedAt: new Date()
        }

        if (requester === item) {
          meta.lastRead = new Date()
        }

        userMeta.push(meta)
      })

      const Conversation = new ConversationSchema({
        participants,
        userMeta,
        updatedAt: new Date()
      })

      const cSave = await Conversation.save()
      return res.json({ success: true, conversation: cSave })
    }
  } catch (err) {
    winston.debug(err)
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiMessages.send = async function (req, res) {
  try {
    const payload = req.body
    const cId = payload.cId
    const owner = payload.owner
    let message = payload.body
    const matches = message.match(/^[Tt]#[0-9]*$/g)

    if (!_.isNull(matches) && matches.length > 0) {
      _.each(matches, function (m) {
        message = message.replace(
          m,
          '<a href="/tickets/' +
            m.replace('T#', '').replace('t#', '') +
            '">T#' +
            m.replace('T#', '').replace('t#', '') +
            '</a>'
        )
      })
    }

    const convo = await ConversationSchema.findOne({ _id: cId })
    if (!convo) throw new Error('Invalid Conversation')

    // Updated conversation to save UpdatedAt field.
    convo.updatedAt = new Date()
    const savedConvo = await convo.save()

    const user = await UserSchema.findOne({ _id: owner })
    if (!user) throw new Error('Invalid Conversation')

    const Message = new MessageSchema({
      conversation: savedConvo._id,
      owner: user,
      body: message
    })

    const mSave = await Message.save()
    return res.json({ success: true, message: mSave })
  } catch (err) {
    winston.debug(err)
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiMessages.getMessagesForConversation = async function (req, res) {
  const conversation = req.params.id
  const page = req.query.page === undefined ? 0 : req.query.page
  const limit = req.query.limit === undefined ? 10 : req.query.limit
  if (_.isUndefined(conversation) || _.isNull(conversation)) {
    return res.status(400).json({ success: false, error: 'Invalid Conversation' })
  }

  try {
    const convo = await ConversationSchema.getConversation(conversation)
    if (!convo) throw new Error('Invalid Conversation')

    const messages = await MessageSchema.getConversationWithObject({
      cid: conversation,
      page,
      limit,
      userMeta: convo.userMeta,
      requestingUser: req.user
    })

    return res.json({
      success: true,
      conversation: convo,
      messages
    })
  } catch (err) {
    winston.debug(err)
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiMessages.deleteConversation = async function (req, res) {
  const conversation = req.params.id

  if (_.isUndefined(conversation) || _.isNull(conversation)) {
    return res.status(400).json({ success: false, error: 'Invalid Conversation' })
  }

  try {
    const convo = await ConversationSchema.getConversation(conversation)
    const user = req.user
    const idx = _.findIndex(convo.userMeta, function (item) {
      return item.userId.toString() === user._id.toString()
    })
    if (idx === -1) {
      return res.status(400).json({ success: false, error: 'Unable to attach to userMeta' })
    }

    convo.userMeta[idx].deletedAt = new Date()

    const sConvo = await convo.save()
    const cleanConvo = sConvo.toObject()
    cleanConvo.participants.forEach(function (p) {
      delete p._id
      delete p.id
      delete p.role
    })

    cleanConvo.userMeta.forEach(function (meta) {
      delete meta.userId
    })

    return res.json({ success: true, conversation: cleanConvo })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

module.exports = apiMessages
