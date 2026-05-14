/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

const userSchema = require('../../src/models/user')
const roleSchema = require('../../src/models/role')
const bugReportSchema = require('../../src/models/bugReport')
const NotificationSchema = require('../../src/models/notification')

// API coverage for bug-report submit/list/resolve plus the admin-only
// gate. The integration test confirms that an admin's notification gets
// written when a report comes in — that's the bridge to the existing
// webpush fan-out.
describe('bug reports API', function () {
  const baseUrl = 'http://localhost:3111'
  const agent = superagent.agent()
  const reporterAgent = superagent.agent()
  let adminToken
  let reporterToken
  let adminUser
  let reporterUser

  before(async function () {
    const adminRole = (await roleSchema.getRoles()).find(r => r.normalized === 'admin')
    const supportRole = (await roleSchema.getRoles()).find(r => r.normalized === 'support')
    expect(adminRole).to.exist
    expect(supportRole).to.exist

    adminUser = await userSchema.create({
      username: 'bugreport.admin',
      password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
      fullname: 'Bug Admin',
      email: 'bugreport.admin@trudesk.io',
      role: adminRole._id,
      accessToken: 'bugreport-admin-token'
    })
    adminToken = 'bugreport-admin-token'

    reporterUser = await userSchema.create({
      username: 'bugreport.reporter',
      password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
      fullname: 'Bug Reporter',
      email: 'bugreport.reporter@trudesk.io',
      role: supportRole._id,
      accessToken: 'bugreport-reporter-token'
    })
    reporterToken = 'bugreport-reporter-token'
  })

  after(async function () {
    await bugReportSchema.deleteMany({})
    await NotificationSchema.deleteMany({ owner: { $in: [adminUser._id, reporterUser._id] } })
    if (adminUser) await userSchema.deleteOne({ _id: adminUser._id })
    if (reporterUser) await userSchema.deleteOne({ _id: reporterUser._id })
  })

  beforeEach(async function () {
    await bugReportSchema.deleteMany({})
    await NotificationSchema.deleteMany({ owner: { $in: [adminUser._id, reporterUser._id] } })
  })

  it('POST /bug-reports rejects without title', async function () {
    try {
      await reporterAgent.post(baseUrl + '/api/v1/bug-reports')
        .set('accesstoken', reporterToken)
        .send({ description: 'no title' })
      throw new Error('should not reach')
    } catch (err) {
      expect(err.response.status).to.equal(400)
    }
  })

  it('POST /bug-reports stores report + creates a notification for every admin (but not the reporter)', async function () {
    const res = await reporterAgent.post(baseUrl + '/api/v1/bug-reports')
      .set('accesstoken', reporterToken)
      .send({
        title: 'Search broken',
        description: 'Clicking the search icon does nothing',
        context: { url: '/app/tickets', userAgent: 'IntegrationTest/1.0', version: 'abc1234' }
      })
    expect(res.body.success).to.equal(true)
    expect(res.body.id).to.exist

    const stored = await bugReportSchema.findById(res.body.id)
    expect(stored.title).to.equal('Search broken')
    expect(stored.description).to.match(/search icon/i)
    expect(stored.context.userAgent).to.equal('IntegrationTest/1.0')

    // Admin should have a notification waiting; reporter should not.
    const adminNotifs = await NotificationSchema.find({ owner: adminUser._id })
    expect(adminNotifs, 'admin gets a bug-report notification').to.have.lengthOf(1)
    expect(adminNotifs[0].title).to.match(/Bug-Report/)
    expect(adminNotifs[0].data.bugReportId.toString()).to.equal(stored._id.toString())

    const reporterNotifs = await NotificationSchema.find({ owner: reporterUser._id })
    expect(reporterNotifs, 'reporter does not self-notify').to.have.lengthOf(0)
  })

  it('GET /bug-reports requires admin', async function () {
    try {
      await reporterAgent.get(baseUrl + '/api/v1/bug-reports').set('accesstoken', reporterToken)
      throw new Error('should not reach')
    } catch (err) {
      expect(err.response.status).to.equal(403)
    }
  })

  it('GET /bug-reports as admin returns the list', async function () {
    // Force distinct createdAt timestamps. On CI both createReport calls
    // can land in the same millisecond, leaving the {createdAt:-1} sort
    // unstable and "newest first" flapping. Stamping explicitly removes
    // the race without slowing the suite down.
    const a = await bugReportSchema.createReport(reporterUser._id, 'A', 'first', {})
    const b = await bugReportSchema.createReport(reporterUser._id, 'B', 'second', {})
    await bugReportSchema.updateOne({ _id: a._id }, { $set: { createdAt: new Date(Date.now() - 1000) } })
    await bugReportSchema.updateOne({ _id: b._id }, { $set: { createdAt: new Date() } })

    const res = await agent.get(baseUrl + '/api/v1/bug-reports').set('accesstoken', adminToken)
    expect(res.body.success).to.equal(true)
    expect(res.body.reports).to.have.lengthOf(2)
    // Newest first
    expect(res.body.reports[0].title).to.equal('B')
  })

  it('PATCH /bug-reports/:id flips resolved (admin only)', async function () {
    const r = await bugReportSchema.createReport(reporterUser._id, 'Flip me', '', {})

    const res = await agent.patch(baseUrl + '/api/v1/bug-reports/' + r._id)
      .set('accesstoken', adminToken)
      .send({ resolved: true })
    expect(res.body.success).to.equal(true)
    expect(res.body.report.resolved).to.equal(true)
    expect(res.body.report.resolvedAt).to.exist
  })

  it('DELETE /bug-reports/:id removes the report (admin only)', async function () {
    const r = await bugReportSchema.createReport(reporterUser._id, 'Bye', '', {})
    const res = await agent.delete(baseUrl + '/api/v1/bug-reports/' + r._id).set('accesstoken', adminToken)
    expect(res.body.success).to.equal(true)
    const after = await bugReportSchema.findById(r._id)
    expect(after).to.be.null
  })
})
