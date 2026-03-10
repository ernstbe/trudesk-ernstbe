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
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const _ = require('lodash')
const mongoose = require('mongoose')
const utils = require('../helpers/utils')

const COLLECTION = 'groups'

/**
 * Group Schema
 * @module models/ticket
 * @class Group
 * @requires {@link User}
 *
 * @property {object} _id ```Required``` ```unique``` MongoDB Object ID
 * @property {String} name ```Required``` ```unique``` Name of Group
 * @property {Array} members Members in this group
 * @property {Array} sendMailTo Members to email when a new / updated ticket has triggered
 */
const groupSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'accounts',
      autopopulate: { select: '-hasL2Auth -preferences -__v' }
    }
  ],
  sendMailTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'accounts' }],
  public: { type: Boolean, required: true, default: false }
})

groupSchema.plugin(require('mongoose-autopopulate'))

groupSchema.pre('save', function () {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())
})

groupSchema.methods.addMember = async function (memberId) {
  const self = this
  if (_.isUndefined(memberId)) {
    throw new Error('Invalid MemberId - $Group.AddMember()')
  }

  if (self.members === null) self.members = []
  if (isMember(self.members, memberId)) {
    return false
  }

  self.members.push(memberId)
  self.members = _.uniq(self.members)

  return true
}

groupSchema.methods.removeMember = async function (memberId) {
  const self = this
  if (_.isUndefined(memberId)) {
    throw new Error('Invalid MemberId - $Group.RemoveMember()')
  }

  if (!isMember(self.members, memberId)) {
    return false
  }

  self.members.splice(_.indexOf(self.members, _.find(self.members, { _id: memberId })), 1)
  self.members = _.uniq(self.members)

  return true
}

groupSchema.methods.isMember = function (memberId) {
  return isMember(this.members, memberId)
}

groupSchema.methods.addSendMailTo = async function (memberId) {
  if (_.isUndefined(memberId)) throw new Error('Invalid MemberId - $Group.AddSendMailTo()')

  if (this.sendMailTo === null) this.sendMailTo = []

  if (isMember(this.sendMailTo, memberId)) return false

  this.sendMailTo.push(memberId)
  this.sendMailTo = _.uniq(this.sendMailTo)

  return true
}

groupSchema.methods.removeSendMailTo = async function (memberId) {
  if (_.isUndefined(memberId)) throw new Error('Invalid MemberId - $Group.RemoveSendMailTo()')

  if (!isMember(this.sendMailTo, memberId)) return false

  this.sendMailTo.splice(_.indexOf(this.sendMailTo, _.find(this.sendMailTo, { _id: memberId })), 1)

  return true
}

groupSchema.statics.getGroupByName = async function (name) {
  if (_.isUndefined(name) || name.length < 1) throw new Error('Invalid Group Name - GroupSchema.GetGroupByName()')

  const q = this.model(COLLECTION)
    .findOne({ name })
    .populate('members', '_id username fullname email role preferences image title deleted')
    .populate('sendMailTo', '_id username fullname email role preferences image title deleted')

  return q.exec()
}

groupSchema.statics.getWithObject = async function (obj) {
  const limit = obj.limit ? Number(obj.limit) : 100
  const page = obj.page ? Number(obj.page) : 0
  const userId = obj.userId

  if (userId) {
    return this.model(COLLECTION)
      .find({ members: userId })
      .limit(limit)
      .skip(page * limit)
      .populate('members', '_id username fullname email role preferences image title deleted')
      .populate('sendMailTo', '_id username fullname email role preferences image title deleted')
      .sort('name')
      .exec()
  }

  return this.model(COLLECTION)
    .find({})
    .limit(limit)
    .skip(page * limit)
    .populate('members', '_id username fullname email role preferences image title deleted')
    .populate('sendMailTo', '_id username fullname email role preferences image title deleted')
    .sort('name')
    .exec()
}

groupSchema.statics.getAllGroups = async function () {
  const q = this.model(COLLECTION)
    .find({})
    .populate('members', '_id username fullname email role preferences image title deleted')
    .populate('sendMailTo', '_id username fullname email role preferences image title deleted')
    .sort('name')

  return q.exec()
}

groupSchema.statics.getAllGroupsNoPopulate = async function () {
  const q = this.model(COLLECTION)
    .find({})
    .sort('name')

  return q.exec()
}

groupSchema.statics.getAllPublicGroups = async function () {
  const q = this.model(COLLECTION)
    .find({ public: true })
    .sort('name')

  return q.exec()
}

groupSchema.statics.getGroups = async function (groupIds) {
  if (_.isUndefined(groupIds)) {
    throw new Error('Invalid Array of Group IDs - GroupSchema.GetGroups()')
  }

  return this.model(COLLECTION)
    .find({ _id: { $in: groupIds } })
    .populate('members', '_id username fullname email role preferences image title deleted')
    .sort('name')
    .exec()
}

groupSchema.statics.getAllGroupsOfUser = async function (userId) {
  if (_.isUndefined(userId)) {
    throw new Error('Invalid UserId - GroupSchema.GetAllGroupsOfUser()')
  }

  const q = this.model(COLLECTION)
    .find({ members: userId })
    .populate('members', '_id username fullname email role preferences image title deleted')
    .populate('sendMailTo', '_id username fullname email role preferences image title deleted')
    .sort('name')

  return q.exec()
}

groupSchema.statics.getAllGroupsOfUserNoPopulate = async function (userId) {
  if (_.isUndefined(userId)) throw new Error('Invalid UserId - GroupSchema.GetAllGroupsOfUserNoPopulate()')

  const q = this.model(COLLECTION)
    .find({ members: userId })
    .sort('name')

  return q.exec()
}

groupSchema.statics.getGroupById = async function (gId) {
  if (_.isUndefined(gId)) throw new Error('Invalid GroupId - GroupSchema.GetGroupById()')

  const q = this.model(COLLECTION)
    .findOne({ _id: gId })
    .populate('members', '_id username fullname email role preferences image title')
    .populate('sendMailTo', '_id username fullname email role preferences image title')

  return q.exec()
}

function isMember (arr, id) {
  const matches = _.filter(arr, function (value) {
    if (value._id.toString() === id.toString()) {
      return value
    }
  })

  return matches.length > 0
}

module.exports = mongoose.model(COLLECTION, groupSchema)
