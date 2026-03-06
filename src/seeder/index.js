var winston = require('../logger')
var _ = require('lodash')

var seeder = {}

seeder.init = async function (callback) {
  var GroupSchema = require('../models/group')
  var TeamSchema = require('../models/team')
  var DepartmentSchema = require('../models/department')

  try {
    var groupCount = await GroupSchema.countDocuments()
    var teamCount = await TeamSchema.countDocuments()
    var deptCount = await DepartmentSchema.countDocuments()

    if (groupCount > 0 || teamCount > 0 || deptCount > 0) {
      winston.debug('Seeder: Data already exists, skipping')
      if (_.isFunction(callback)) return callback()
      return
    }

    winston.debug('Seeder: No groups, teams, or departments found. Creating seed data...')

    // 1. Create Groups
    var allgemeinGroup = await GroupSchema.create({ name: 'Allgemein', public: true })
    var einsatzGroup = await GroupSchema.create({ name: 'Einsatz', public: false })
    var verwaltungGroup = await GroupSchema.create({ name: 'Verwaltung', public: false })
    var itGroup = await GroupSchema.create({ name: 'IT & Kommunikation', public: false })
    var jugendGroup = await GroupSchema.create({ name: 'Jugend', public: false })
    var kuecheGroup = await GroupSchema.create({ name: 'Küche', public: false })
    winston.debug('Seeder: Created 6 groups')

    // 2. Create Teams
    var s1Team = await TeamSchema.create({ name: 'S1 - Personal' })
    var s3Team = await TeamSchema.create({ name: 'S3 - Einsatz' })
    var s6Team = await TeamSchema.create({ name: 'S6 - IuK' })
    var jugendTeam = await TeamSchema.create({ name: 'Jugend' })
    var kuecheTeam = await TeamSchema.create({ name: 'Küche' })
    winston.debug('Seeder: Created 5 teams')

    // 3. Create Departments (reference teams and groups)
    await DepartmentSchema.create({
      name: 'Verwaltung',
      teams: [s1Team._id],
      groups: [allgemeinGroup._id, verwaltungGroup._id]
    })
    await DepartmentSchema.create({
      name: 'Einsatz',
      teams: [s3Team._id],
      groups: [einsatzGroup._id]
    })
    await DepartmentSchema.create({
      name: 'IT-Support',
      teams: [s6Team._id],
      groups: [itGroup._id]
    })
    await DepartmentSchema.create({
      name: 'Jugend',
      teams: [jugendTeam._id],
      groups: [jugendGroup._id]
    })
    await DepartmentSchema.create({
      name: 'Küche',
      teams: [kuecheTeam._id],
      groups: [kuecheGroup._id]
    })
    winston.debug('Seeder: Created 5 departments')

    winston.info('Seeder: Finished — created 6 groups, 5 teams, 5 departments')
  } catch (err) {
    winston.warn('Seeder: Error during seeding — ' + err.message)
  }

  if (_.isFunction(callback)) return callback()
}

module.exports = seeder
