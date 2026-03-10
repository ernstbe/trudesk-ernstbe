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

const mongoose = require('mongoose')
const _ = require('lodash')

const COLLECTION = 'notification'

// Types
// Type 0 : Green Check
// Type 1 : Warning
// Type 2 : Red Exclamation

const notificationSchema = mongoose.Schema({
  created: { type: Date, default: Date.now },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts' },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: Number,
  data: Object,
  unread: { type: Boolean, default: true }
})

notificationSchema.methods.markRead = async function () {
  this.unread = false

  return true
}

notificationSchema.statics.getNotification = async function (id) {
  if (_.isUndefined(id)) {
    throw new Error('Invalid ObjectId - NotificationSchema.GetNotification()')
  }

  return this.model(COLLECTION).findOne({ _id: id })
}

notificationSchema.statics.findAllForUser = async function (oId) {
  if (_.isUndefined(oId)) {
    throw new Error('Invalid ObjectId - NotificationSchema.FindAllForUser()')
  }

  const q = this.model(COLLECTION)
    .find({ owner: oId })
    .sort({ created: -1 })
    .limit(100)

  return q.exec()
}

notificationSchema.statics.getForUserWithLimit = async function (oId) {
  if (_.isUndefined(oId)) throw new Error('Invalid ObjectId - NotificationSchema.GetForUserWithLimit()')

  return this.model(COLLECTION)
    .find({ owner: oId })
    .sort({ created: -1 })
    .limit(5)
    .exec()
}

notificationSchema.statics.getCount = async function (oId) {
  if (_.isUndefined(oId)) {
    throw new Error('Invalid ObjectId - NotificationSchema.GetCount()')
  }

  return this.model(COLLECTION).countDocuments({ owner: oId })
}

notificationSchema.statics.getUnreadCount = async function (oId) {
  if (_.isUndefined(oId)) {
    throw new Error('Invalid ObjectId - NotificationSchema.GetUnreadCount()')
  }

  return this.model(COLLECTION).countDocuments({ owner: oId, unread: true })
}

notificationSchema.statics.clearNotifications = async function (oId) {
  if (_.isUndefined(oId)) {
    throw new Error('Invalid UserId - NotificationSchema.ClearNotifications()')
  }

  return this.model(COLLECTION).deleteMany({ owner: oId })
}

module.exports = mongoose.model(COLLECTION, notificationSchema)
