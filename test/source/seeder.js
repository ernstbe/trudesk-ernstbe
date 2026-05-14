/* eslint-disable no-unused-expressions */
const expect = require('chai').expect

const seeder = require('../../src/seeder')
const tagSchema = require('../../src/models/tag')
const groupSchema = require('../../src/models/group')
const teamSchema = require('../../src/models/team')
const departmentSchema = require('../../src/models/department')

// Regression for "deleted default tags reappear after every container restart".
// The seeder previously called `seedTags()` (and the other idempotent seeders)
// outside the first-install branch, so any default THW tag the admin removed
// via the Settings UI was recreated by name on the next boot. The fix gates
// those calls behind the same "no groups/teams/depts exist" condition that
// guards the rest of the seed data.
describe('seeder.init: idempotent seeders only run on initial install', function () {
  const defaultTag = 'Reparatur'

  describe('with existing groups/teams/depts (the prod restart scenario)', function () {
    before(async function () {
      // The global test setup already creates a `TEST` group, so the seeder
      // will see the "data exists" branch — no extra fixture work needed.
      const existing = await groupSchema.countDocuments()
      expect(existing, 'global test setup must have created a group').to.be.greaterThan(0)
    })

    it('does not recreate a default tag that an admin has deleted', async function () {
      // Pretend the admin previously deleted `Reparatur` via Settings.
      await tagSchema.deleteMany({ name: defaultTag })
      const beforeCount = await tagSchema.countDocuments({ name: defaultTag })
      expect(beforeCount).to.equal(0)

      await seeder.init()

      const afterCount = await tagSchema.countDocuments({ name: defaultTag })
      expect(afterCount, '`' + defaultTag + '` must stay deleted across reboot').to.equal(0)
    })
  })

  describe('on a fresh install (no groups/teams/depts)', function () {
    let savedGroups
    let savedTeams
    let savedDepts
    let savedTags

    before(async function () {
      // Stash and clear the install state so the seeder takes the
      // first-install branch.
      savedGroups = await groupSchema.find({}).lean()
      savedTeams = await teamSchema.find({}).lean()
      savedDepts = await departmentSchema.find({}).lean()
      savedTags = await tagSchema.find({}).lean()

      await groupSchema.deleteMany({})
      await teamSchema.deleteMany({})
      await departmentSchema.deleteMany({})
      await tagSchema.deleteMany({})
    })

    after(async function () {
      // Restore the pre-test state so later test files keep their fixtures.
      await groupSchema.deleteMany({})
      await teamSchema.deleteMany({})
      await departmentSchema.deleteMany({})
      await tagSchema.deleteMany({})
      if (savedGroups.length) await groupSchema.insertMany(savedGroups)
      if (savedTeams.length) await teamSchema.insertMany(savedTeams)
      if (savedDepts.length) await departmentSchema.insertMany(savedDepts)
      if (savedTags.length) await tagSchema.insertMany(savedTags)
    })

    it('creates the default THW tag set', async function () {
      await seeder.init()

      const created = await tagSchema.findOne({ name: defaultTag })
      expect(created, '`' + defaultTag + '` must be seeded on initial install').to.exist
    })
  })
})
