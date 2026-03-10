const winston = require('../logger')
const _ = require('lodash')

const seeder = {}

seeder.init = async function (callback) {
  const GroupSchema = require('../models/group')
  const TeamSchema = require('../models/team')
  const DepartmentSchema = require('../models/department')

  try {
    const groupCount = await GroupSchema.countDocuments()
    const teamCount = await TeamSchema.countDocuments()
    const deptCount = await DepartmentSchema.countDocuments()

    if (groupCount > 0 || teamCount > 0 || deptCount > 0) {
      winston.debug('Seeder: Data already exists, skipping')
    } else {
      winston.debug('Seeder: No groups, teams, or departments found. Creating seed data...')

      // 1. Create Groups
      const allgemeinGroup = await GroupSchema.create({ name: 'Allgemein', public: true })
      const einsatzGroup = await GroupSchema.create({ name: 'Einsatz', public: false })
      const verwaltungGroup = await GroupSchema.create({ name: 'Verwaltung', public: false })
      const itGroup = await GroupSchema.create({ name: 'IT & Kommunikation', public: false })
      const jugendGroup = await GroupSchema.create({ name: 'Jugend', public: false })
      const kuecheGroup = await GroupSchema.create({ name: 'Küche', public: false })
      const liegenschaftenGroup = await GroupSchema.create({ name: 'Liegenschaften', public: false })
      winston.debug('Seeder: Created 7 groups')

      // 2. Create Teams
      const s1Team = await TeamSchema.create({ name: 'S1 - Personal' })
      const s3Team = await TeamSchema.create({ name: 'S3 - Einsatz' })
      const s4Team = await TeamSchema.create({ name: 'S4 - Versorgung' })
      const s6Team = await TeamSchema.create({ name: 'S6 - IuK' })
      const jugendTeam = await TeamSchema.create({ name: 'Jugend' })
      const kuecheTeam = await TeamSchema.create({ name: 'Küche' })
      winston.debug('Seeder: Created 6 teams')

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
      await DepartmentSchema.create({
        name: 'Liegenschaften',
        teams: [s4Team._id],
        groups: [liegenschaftenGroup._id]
      })
      winston.debug('Seeder: Created 6 departments')

      winston.info('Seeder: Finished — created 7 groups, 6 teams, 6 departments')
    }

    // Seed ticket types, tags, and statuses (idempotent — skips if they already exist)
    await seedTicketTypes()
    await seedTags()
    await seedProcurementStatuses()
    await seedBeschlussStatuses()
  } catch (err) {
    winston.warn('Seeder: Error during seeding — ' + err.message)
  }

  if (_.isFunction(callback)) return callback()
}

async function seedTicketTypes () {
  const TicketTypeSchema = require('../models/tickettype')
  const PrioritySchema = require('../models/ticketpriority')

  const thwTypes = ['Gebaeude/Liegenschaften', 'Beschaffung', 'Beschluss']

  const priorities = await PrioritySchema.find({})
  const priorityIds = priorities.map(function (p) { return p._id })

  for (let i = 0; i < thwTypes.length; i++) {
    const existing = await TicketTypeSchema.getTypeByName(thwTypes[i])
    if (!existing) {
      await TicketTypeSchema.create({ name: thwTypes[i], priorities: priorityIds })
      winston.debug('Seeder: Created ticket type "' + thwTypes[i] + '"')
    }
  }
}

async function seedTags () {
  const TagSchema = require('../models/tag')

  const thwTags = [
    'Reparatur', 'Defekt', 'Wartung', 'Pruefung', 'Sicherheit',
    'Heizung', 'Elektrik', 'Sanitaer', 'Dach', 'Aussengelaende'
  ]

  for (let i = 0; i < thwTags.length; i++) {
    const count = await TagSchema.tagExist(thwTags[i])
    if (count === 0) {
      await TagSchema.create({ name: thwTags[i] })
      winston.debug('Seeder: Created tag "' + thwTags[i] + '"')
    }
  }
}

async function seedProcurementStatuses () {
  const StatusSchema = require('../models/ticketStatus')

  const procurementStatuses = [
    { name: 'Antrag', htmlColor: '#FF9800', order: 10, slatimer: true, isResolved: false },
    { name: 'Genehmigt', htmlColor: '#4CAF50', order: 11, slatimer: true, isResolved: false },
    { name: 'Bestellt', htmlColor: '#2196F3', order: 12, slatimer: true, isResolved: false },
    { name: 'Geliefert', htmlColor: '#8BC34A', order: 13, slatimer: false, isResolved: true },
    { name: 'Abgelehnt', htmlColor: '#F44336', order: 14, slatimer: false, isResolved: true }
  ]

  for (let i = 0; i < procurementStatuses.length; i++) {
    const s = procurementStatuses[i]
    const existing = await StatusSchema.findOne({ name: s.name })
    if (!existing) {
      await StatusSchema.create(s)
      winston.debug('Seeder: Created status "' + s.name + '"')
    }
  }
}

async function seedBeschlussStatuses () {
  const StatusSchema = require('../models/ticketStatus')

  const beschlussStatuses = [
    { name: 'Beschlossen', htmlColor: '#9C27B0', order: 20, slatimer: true, isResolved: false },
    { name: 'In Umsetzung', htmlColor: '#FF9800', order: 21, slatimer: true, isResolved: false },
    { name: 'Umgesetzt', htmlColor: '#4CAF50', order: 22, slatimer: false, isResolved: true }
  ]

  for (let i = 0; i < beschlussStatuses.length; i++) {
    const s = beschlussStatuses[i]
    const existing = await StatusSchema.findOne({ name: s.name })
    if (!existing) {
      await StatusSchema.create(s)
      winston.debug('Seeder: Created status "' + s.name + '"')
    }
  }
}

module.exports = seeder
