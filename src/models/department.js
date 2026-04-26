/*
      .                              .o8                     oooo
   .o8                             "888                     `888
 .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
   888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
   888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
   888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
   "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 ========================================================================
 Created:    11/1/2018
 Author:     Chris Brame

 **/

const mongoose = require('mongoose')
const utils = require('../helpers/utils')

// Refs
require('./group')
const Teams = require('./team')
const Groups = require('./group')

const COLLECTION = 'departments'

const departmentSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  normalized: { type: String },
  teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'teams', autopopulate: true }],
  allGroups: { type: Boolean, default: false },
  publicGroups: { type: Boolean, default: false },
  groups: [{ type: mongoose.Schema.Types.ObjectId, ref: 'groups', autopopulate: true }]
})

departmentSchema.plugin(require('mongoose-autopopulate'))

departmentSchema.pre('save', function () {
  this.name = utils.sanitizeFieldPlainText(this.name.trim())
  this.normalized = utils.sanitizeFieldPlainText(this.name.trim().toLowerCase())
})

departmentSchema.statics.getDepartmentsByTeam = async function (teamIds) {
  return this.model(COLLECTION)
    .find({ teams: { $in: teamIds } })
    .exec()
}

departmentSchema.statics.getUserDepartments = async function (userId) {
  const teams = await Teams.getTeamsOfUser(userId)
  return this.model(COLLECTION).find({ teams: { $in: teams } }).exec()
}

departmentSchema.statics.getDepartmentGroupsOfUser = async function (userId) {
  const teams = await Teams.getTeamsOfUser(userId)
  const departments = await this.model(COLLECTION).find({ teams: { $in: teams } })

  const hasAllGroups = departments.some(d => d.allGroups === true)
  const hasPublicGroups = departments.some(d => d.publicGroups === true)
  if (hasAllGroups) {
    return Groups.getAllGroups()
  } else if (hasPublicGroups) {
    const publicGroups = await Groups.getAllPublicGroups()
    const mapped = departments.map(department => {
      return department.groups
    })

    let merged = [].concat(publicGroups, mapped)
    merged = merged.flat(Infinity)
    const seenIds = new Set()
    merged = merged.filter(i => {
      const id = i._id.toString()
      if (seenIds.has(id)) return false
      seenIds.add(id)
      return true
    })

    return merged
  } else {
    const groups = departments.map(function (department) {
        return department.groups
      }).flat(Infinity)

    return groups
  }
}

departmentSchema.statics.getDepartmentsByGroup = async function (groupId) {
  return this.model(COLLECTION)
    .find({ $or: [{ groups: groupId }, { allGroups: true }] })
    .exec()
}

module.exports = mongoose.model(COLLECTION, departmentSchema)
