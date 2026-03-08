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
const moment = require('moment')
require('moment-duration-format')
const utils = require('../helpers/utils')

const COLLECTION = 'priorities'

const prioritySchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    overdueIn: { type: Number, required: true, default: 2880 }, // Minutes until overdue (48 Hours)
    htmlColor: { type: String, default: '#29b955' },

    migrationNum: { type: Number, index: true }, // Needed to convert <1.0 priorities to new format.
    default: { type: Boolean }
  },
  {
    toJSON: {
      virtuals: true
    }
  }
)

prioritySchema.pre('save', function (next) {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())

  return next()
})

prioritySchema.virtual('durationFormatted').get(function () {
  const priority = this
  return moment
    .duration(priority.overdueIn, 'minutes')
    .format('Y [year], M [month], d [day], h [hour], m [min]', { trim: 'both' })
})

prioritySchema.statics.getPriority = async function (_id) {
  return this.model(COLLECTION)
    .findOne({ _id })
    .exec()
}

prioritySchema.statics.getPriorities = async function () {
  return this.model(COLLECTION)
    .find({})
    .exec()
}

prioritySchema.statics.getByMigrationNum = async function (num) {
  return this.model(COLLECTION)
    .findOne({ migrationNum: num })
    .exec()
}

module.exports = mongoose.model(COLLECTION, prioritySchema)
