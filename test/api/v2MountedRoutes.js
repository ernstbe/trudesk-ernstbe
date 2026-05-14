/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

const userSchema = require('../../src/models/user')
const roleSchema = require('../../src/models/role')
const webpush = require('../../src/webpush')
const bugReportSchema = require('../../src/models/bugReport')
const NotificationSchema = require('../../src/models/notification')

// Smoke coverage for the v2 mounts of v1-only controllers (sessions,
// push subscriptions, bug reports). The point is just to confirm the
// routes are wired and accept the v1 accesstoken via the apiv2
// middleware fallback — the underlying controllers already have
// dedicated tests (test/models/userAccessTokenExpiry.js,
// test/models/pushSubscriptions.js, test/api/bugReports.js).
describe('v2 mounts for v1 controllers', function () {
  const baseUrl = 'http://localhost:3111'
  const agent = superagent.agent()
  let createdUser
  let accessToken

  before(async function () {
    await webpush.init()
    const adminRole = (await roleSchema.getRoles()).find(r => r.normalized === 'admin')
    createdUser = await userSchema.create({
      username: 'v2mount.test',
      password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
      fullname: 'V2 Mount Test',
      email: 'v2mount.test@trudesk.io',
      role: adminRole._id,
      accessToken: 'v2mount-test-token'
    })
    accessToken = 'v2mount-test-token'
  })

  after(async function () {
    await bugReportSchema.deleteMany({ reportedBy: createdUser._id })
    await NotificationSchema.deleteMany({ owner: createdUser._id })
    if (createdUser) await userSchema.deleteOne({ _id: createdUser._id })
  })

  it('GET /api/v2/account/sessions returns the sessions list', async function () {
    const res = await agent.get(baseUrl + '/api/v2/account/sessions').set('accesstoken', accessToken)
    expect(res.body.success).to.equal(true)
    expect(res.body.sessions).to.be.an('array')
  })

  it('GET /api/v2/account/push/vapid-public returns the public key', async function () {
    const res = await agent.get(baseUrl + '/api/v2/account/push/vapid-public').set('accesstoken', accessToken)
    expect(res.body.success).to.equal(true)
    expect(res.body.publicKey).to.equal(webpush.getPublicKey())
  })

  it('POST /api/v2/account/push/subscribe + DELETE round-trip a subscription', async function () {
    const endpoint = 'https://fcm.example.test/v2-mount-test'
    const post = await agent.post(baseUrl + '/api/v2/account/push/subscribe')
      .set('accesstoken', accessToken)
      .send({ endpoint, keys: { p256dh: 'fake', auth: 'fake' }, deviceId: 'd1' })
    expect(post.body.success).to.equal(true)

    const del = await agent.delete(baseUrl + '/api/v2/account/push/subscribe')
      .set('accesstoken', accessToken)
      .send({ endpoint })
    expect(del.body.success).to.equal(true)
  })

  it('POST + GET /api/v2/bug-reports round-trip a report (admin)', async function () {
    const submit = await agent.post(baseUrl + '/api/v2/bug-reports')
      .set('accesstoken', accessToken)
      .send({ title: 'v2 mount sanity', description: 'submitted via /api/v2', context: {} })
    expect(submit.body.success).to.equal(true)

    const list = await agent.get(baseUrl + '/api/v2/bug-reports').set('accesstoken', accessToken)
    expect(list.body.success).to.equal(true)
    const found = list.body.reports.find(r => r.title === 'v2 mount sanity')
    expect(found, 'submitted report is visible in v2 list').to.exist

    const del = await agent.delete(baseUrl + '/api/v2/bug-reports/' + found._id).set('accesstoken', accessToken)
    expect(del.body.success).to.equal(true)
  })
})
