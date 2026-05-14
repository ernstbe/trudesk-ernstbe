/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

const userSchema = require('../../src/models/user')
const roleSchema = require('../../src/models/role')
const tagSchema = require('../../src/models/tag')
const groupSchema = require('../../src/models/group')
const NotificationSchema = require('../../src/models/notification')

// Smoke that the v2 mounts of v1 ticket/notification controllers work.
// The actual controller behaviour has its own unit coverage; this suite
// confirms the routes are wired and accept the v1 accesstoken via the
// apiv2 middleware fallback.
describe('v2 ticket + notification mounts', function () {
  const baseUrl = 'http://localhost:3111'
  const agent = superagent.agent()
  let adminUser
  let adminToken
  let testGroup

  before(async function () {
    const adminRole = (await roleSchema.getRoles()).find(r => r.normalized === 'admin')
    adminUser = await userSchema.create({
      username: 'v2endpoints.admin',
      password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
      fullname: 'V2 Endpoints Admin',
      email: 'v2endpoints.admin@trudesk.io',
      role: adminRole._id,
      accessToken: 'v2endpoints-admin-token'
    })
    adminToken = 'v2endpoints-admin-token'

    // Seed a tag and a group so the read endpoints have something to return.
    await tagSchema.create({ name: 'v2-endpoint-test-tag' })
    testGroup = await groupSchema.create({ name: 'V2 Test Group', members: [adminUser._id] })
  })

  after(async function () {
    await tagSchema.deleteMany({ name: 'v2-endpoint-test-tag' })
    if (testGroup) await groupSchema.deleteOne({ _id: testGroup._id })
    await NotificationSchema.deleteMany({ owner: adminUser._id })
    if (adminUser) await userSchema.deleteOne({ _id: adminUser._id })
  })

  it('GET /api/v2/tickets/tags returns the tag list', async function () {
    const res = await agent.get(baseUrl + '/api/v2/tickets/tags').set('accesstoken', adminToken)
    expect(res.body.success).to.equal(true)
    expect(res.body.tags).to.be.an('array')
    expect(res.body.tags.some(t => t.name === 'v2-endpoint-test-tag')).to.equal(true)
  })

  it('GET /api/v2/tickets/search responds with the standard shape', async function () {
    const res = await agent.get(baseUrl + '/api/v2/tickets/search?search=nonexistentstring').set('accesstoken', adminToken)
    expect(res.body.success).to.equal(true)
    expect(res.body.tickets).to.be.an('array')
    expect(res.body).to.have.property('count')
    expect(res.body).to.have.property('totalCount')
  })

  it('GET /api/v2/tickets/group/:id returns tickets array (possibly empty)', async function () {
    const res = await agent.get(baseUrl + '/api/v2/tickets/group/' + testGroup._id).set('accesstoken', adminToken)
    expect(res.body.success).to.equal(true)
    expect(res.body.tickets).to.be.an('array')
  })

  it('POST /api/v2/notifications/:id/read marks a notification read', async function () {
    const notif = await NotificationSchema.create({
      owner: adminUser._id,
      title: 'v2 mount read test',
      message: 'unread initially',
      type: 0,
      data: {}
    })
    const res = await agent.post(baseUrl + '/api/v2/notifications/' + notif._id + '/read').set('accesstoken', adminToken)
    expect(res.body.success).to.equal(true)
    const fresh = await NotificationSchema.findById(notif._id)
    expect(fresh.unread).to.equal(false)
  })

  it('POST /api/v2/notifications/read-all flips every unread of mine', async function () {
    await NotificationSchema.deleteMany({ owner: adminUser._id })
    await NotificationSchema.create({ owner: adminUser._id, title: 'a', message: 'm', type: 0, data: {} })
    await NotificationSchema.create({ owner: adminUser._id, title: 'b', message: 'm', type: 0, data: {} })

    const res = await agent.post(baseUrl + '/api/v2/notifications/read-all').set('accesstoken', adminToken)
    expect(res.body.success).to.equal(true)
    expect(res.body.updated).to.be.at.least(2)

    const remaining = await NotificationSchema.countDocuments({ owner: adminUser._id, unread: true })
    expect(remaining).to.equal(0)
  })
})
