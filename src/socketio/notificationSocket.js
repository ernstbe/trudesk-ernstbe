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
const utils = require('../helpers/utils')
const socketEvents = require('./socketEventConsts')

const events = {}

function register (socket) {
  events.updateNotifications(socket)
  events.updateAllNotifications(socket)
  events.markNotificationRead(socket)
  events.clearNotifications(socket)
}

function eventLoop () {
  updateNotifications()
}

async function updateNotifications (socket) {
  const notificationSchema = require('../models/notification')
  // eslint-disable-next-line no-unused-vars
  for (const [_, s] of io.of('/').sockets) {
    const targetSocket = socket || s
    try {
      const notifications = {}
      const [items, count] = await Promise.all([
        notificationSchema.getForUserWithLimit(targetSocket.request.user._id),
        notificationSchema.getUnreadCount(targetSocket.request.user._id)
      ])
      notifications.items = items
      notifications.count = count

      utils.sendToSelf(targetSocket, socketEvents.NOTIFICATIONS_UPDATE, notifications)
    } catch (err) {
      winston.warn(err)
    }

    // If a specific socket was passed, only update that one
    if (socket) break
  }
}

async function updateAllNotifications (socket) {
  const notificationSchema = require('../models/notification')
  try {
    const notifications = {}
    const items = await notificationSchema.findAllForUser(socket.request.user._id)
    notifications.items = items

    utils.sendToSelf(socket, 'updateAllNotifications', notifications)
  } catch (err) {
    winston.warn(err)
  }
}

events.updateNotifications = function (socket) {
  socket.on(socketEvents.NOTIFICATIONS_UPDATE, function () {
    updateNotifications(socket)
  })
}

events.updateAllNotifications = function (socket) {
  socket.on('updateAllNotifications', function () {
    updateAllNotifications(socket)
  })
}

events.markNotificationRead = function (socket) {
  socket.on(socketEvents.NOTIFICATIONS_MARK_READ, async function (_id) {
    if (_.isUndefined(_id)) return true
    const notificationSchema = require('../models/notification')
    try {
      const notification = await notificationSchema.getNotification(_id)
      await notification.markRead()
      await notification.save()
      updateNotifications(socket)
    } catch (err) {
      winston.warn(err)
    }
  })
}

events.clearNotifications = function (socket) {
  socket.on(socketEvents.NOTIFICATIONS_CLEAR, async function () {
    const userId = socket.request.user._id
    if (_.isUndefined(userId)) return true
    const notifications = {}
    notifications.items = []
    notifications.count = 0

    const notificationSchema = require('../models/notification')
    try {
      await notificationSchema.clearNotifications(userId)
      utils.sendToSelf(socket, socketEvents.UPDATE_NOTIFICATIONS, notifications)
    } catch (err) {
      winston.warn(err)
    }
  })
}

module.exports = {
  events,
  eventLoop,
  register
}
