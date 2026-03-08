/* eslint-disable no-unused-expressions */
/* globals server socketServer */
const expect = require('chai').expect
let mongoose = require('mongoose')
const path = require('path')
const _ = require('lodash')
const { MongoMemoryServer } = require('mongodb-memory-server')

let database, db
let mongoServer

// Global Setup for tests
before(function (done) {
  this.timeout(120000) // Longer timeout: in-memory MongoDB download + defaults init
  delete require.cache[require.resolve('../src/database')]
  delete require.cache[require.resolve('mongoose')]
  mongoose = require('mongoose')
  database = require('../src/database')

  mongoose.connection.close()

  MongoMemoryServer.create().then(function (server) {
    mongoServer = server
    const CONNECTION_URI = mongoServer.getUri()

    database.init(async function (err, d) {
      try {
        expect(err).to.not.exist
        expect(d).to.be.a('object')
        expect(d.connection).to.exist

        db = d

        await mongoose.connection.db.dropDatabase()

        const counter = require('../src/models/counters')
        await counter.create({
          _id: 'tickets',
          next: 1000
        })

        const typeSchema = require('../src/models/tickettype')
        await typeSchema.insertMany([{ name: 'Task' }, { name: 'Issue' }])

        const statusSchema = require('../src/models/ticketStatus')
        await statusSchema.insertMany([
          { name: 'New', uid: 0, order: 0, isLocked: true },
          { name: 'Open', uid: 1, order: 1, isLocked: true },
          { name: 'Pending', uid: 2, order: 2, isLocked: true },
          { name: 'Closed', uid: 3, order: 3, isLocked: true, isResolved: true }
        ])

        await require('../src/settings/defaults').init()

        const roleSchema = require('../src/models/role')
        const r = await roleSchema.getRoles()
        expect(r).to.be.a('array')
        global.roles = r

        const userSchema = require('../src/models/user')
        const adminRole = _.find(global.roles, { normalized: 'admin' })
        expect(adminRole).to.exist
        const adminUser = await userSchema.create({
          username: 'trudesk',
          password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
          fullname: 'Trudesk',
          email: 'trudesk@trudesk.io',
          role: adminRole._id,
          accessToken: 'da39a3ee5e6b4b0d3255bfef95601890afd80709'
        })
        expect(adminUser).to.be.a('object')

        const supportRole = _.find(global.roles, { normalized: 'support' })
        expect(supportRole).to.exist
        global.supportRoleId = supportRole._id

        const fakeUser = await userSchema.create({
          username: 'fake.user',
          password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
          fullname: 'Fake user',
          email: 'fake.user@trudesk.io',
          role: supportRole._id,
          accessToken: '456'
        })
        expect(fakeUser).to.be.a('object')

        const userRole = _.find(global.roles, { normalized: 'user' })
        expect(userRole).to.exist
        global.userRoleId = userRole._id
        const deletedUser = await userSchema.create({
          username: 'deleted.user',
          password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
          fullname: 'Deleted User',
          email: 'deleted.user@trudesk.io',
          role: userRole._id,
          accessToken: '123',
          deleted: true
        })
        expect(deletedUser).to.be.a('object')

        const groupSchema = require('../src/models/group')
        const group = await groupSchema.create({
          name: 'TEST'
        })
        expect(group).to.be.a('object')

        const ws = require('../src/webserver')
        ws.init(
          db,
          function (err) {
            expect(err).to.not.exist
            ws.listen(function (err) {
              expect(err).to.not.exist
              global.server = ws.server

              require('../src/socketserver')(ws)

              done()
            })
          },
          3111
        )
      } catch (e) {
        done(e)
      }
    }, CONNECTION_URI)
  }).catch(function (e) { done(e) })
})

// Global Teardown for tests
after(async function () {
  this.timeout(10000)
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.dropDatabase()
    await mongoose.connection.close()
  }
  if (mongoServer) {
    await mongoServer.stop()
  }
  // Stop in-memory MongoDB if it was used by the app module
  const dbModule = require('../src/database')
  const memServer = dbModule.getMemoryServer && dbModule.getMemoryServer()
  if (memServer) {
    await memServer.stop()
  }
  if (typeof socketServer !== 'undefined' && socketServer && socketServer.eventLoop) {
    socketServer.eventLoop.stop()
  }
  if (typeof server !== 'undefined' && server) {
    server.close()
  }
})

// Start DB Tests
describe('Database', function () {
  beforeEach(function (done) {
    // Need to invalid Database Module before each test runs.
    delete require.cache[path.join(__dirname, '../src/database')]
    database = require('../src/database')

    done()
  })

  it('should connect without error', function (done) {
    const uri = mongoServer.getUri()
    database.init(function (err, db) {
      expect(err).to.not.exist
      expect(db).to.be.a('object')
      expect(db.connection._readyState).to.equal(1)

      // Test rerunning init and getting DB back without calling connect.
      database.init(function (err, db) {
        expect(err).to.not.exist
        expect(db).to.be.a('object')
        expect(db.connection._readyState).to.equal(1)

        done()
      }, uri)
    }, uri)
  })
})
