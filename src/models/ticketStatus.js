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

// var _               = require('lodash');
const mongoose = require('mongoose')
require('moment-duration-format')
const utils = require('../helpers/utils')
const _ = require('lodash')

const COLLECTION = 'statuses'

const statusSchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    htmlColor: { type: String, default: '#29b955' },
    uid: { type: Number, unique: true, index: true },
    order: { type: Number, index: true },
    slatimer: { type: Boolean, default: true },
    isResolved: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false }
  },
  {
    toJSON: {
      virtuals: true
    }
  }
)

statusSchema.pre('save', async function () {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())

  if (!_.isUndefined(this.uid) || this.uid) {
    return
  }

  const c = require('./counters')
  const res = await c.increment('status')

  this.uid = res.next

  if (_.isUndefined(this.uid)) {
    throw new Error('Invalid UID.')
  }
})

statusSchema.statics.getStatus = async function () {
  return this.model(COLLECTION)
    .find({})
    .sort({ order: 1 })
    .exec()
}

statusSchema.statics.getStatusById = async function (_id) {
  return this.model(COLLECTION)
    .findOne({ _id })
    .exec()
}

statusSchema.statics.getStatusByUID = async function (uid) {
  return this.model(COLLECTION)
    .findOne({ uid })
    .exec()
}

module.exports = mongoose.model(COLLECTION, statusSchema)
