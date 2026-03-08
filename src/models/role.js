/*
     .                              .o8                     oooo
   .o8                             "888                     `888
 .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
   888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
   888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
   888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
   "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 ========================================================================
 Created:    10/28/2018
 Author:     Chris Brame

 **/

const mongoose = require('mongoose')
const mongooseLeanVirtuals = require('mongoose-lean-virtuals')
const _ = require('lodash')
const utils = require('../helpers/utils')

const COLLECTION = 'roles'

const roleSchema = mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    normalized: String,
    description: String,
    grants: [{ type: String, required: true }],
    hierarchy: { type: Boolean, required: true, default: true }
  },
  {
    toObject: { getters: true, virtuals: true },
    toJSON: { virtuals: true }
  }
)

roleSchema.virtual('isAdmin').get(function () {
  if (_.isUndefined(global.roles)) return false
  const role = _.find(global.roles, { normalized: this.normalized })
  if (!role) return false

  return _.indexOf(role.grants, 'admin:*') !== -1
})

roleSchema.virtual('isAgent').get(function () {
  if (_.isUndefined(global.roles)) return false
  const role = _.find(global.roles, { normalized: this.normalized })
  if (!role) return false

  return _.indexOf(role.grants, 'agent:*') !== -1
})

roleSchema.plugin(mongooseLeanVirtuals)

roleSchema.pre('save', function (next) {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())
  this.normalized = utils.sanitizeFieldPlainText(this.name.toLowerCase().trim())

  return next()
})

roleSchema.methods.updateGrants = async function (grants) {
  this.grants = grants
  return this.save()
}

roleSchema.methods.updateGrantsAndHierarchy = async function (grants, hierarchy) {
  this.grants = grants
  this.hierarchy = hierarchy
  return this.save()
}

roleSchema.statics.getRoles = async function () {
  return this.model(COLLECTION)
    .find({})
    .exec()
}

roleSchema.statics.getRolesLean = async function () {
  return this.model(COLLECTION)
    .find({})
    .lean({ virtuals: true })
    .exec()
}

roleSchema.statics.getRole = async function (id) {
  const q = this.model(COLLECTION).findOne({ _id: id })

  return q.exec()
}

roleSchema.statics.getRoleByName = async function (name) {
  const q = this.model(COLLECTION).findOne({ normalized: new RegExp('^' + name.trim() + '$', 'i') })

  return q.exec()
}

roleSchema.statics.getAgentRoles = async function () {
  const roles = await this.model(COLLECTION).find({}).exec()

  const rolesWithAgent = _.filter(roles, function (role) {
    return _.indexOf(role.grants, 'agent:*') !== -1
  })

  return rolesWithAgent
}

// Alias
roleSchema.statics.get = roleSchema.statics.getRole

module.exports = mongoose.model(COLLECTION, roleSchema)
