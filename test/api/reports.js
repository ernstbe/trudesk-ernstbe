/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

describe('api/reports.js', function () {
  const agent = superagent.agent()
  let testGroupId
  const baseUrl = 'http://localhost:3111'

  before(async function () {
    await new Promise(function (resolve, reject) {
      agent
        .post(baseUrl + '/login')
        .type('json')
        .send({
          'login-username': 'trudesk',
          'login-password': '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW'
        })
        .end(function (err, res) {
          if (err) return reject(err)
          resolve()
        })
    })

    const groupSchema = require('../../src/models/group')
    const group = await groupSchema.getGroupByName('TEST')
    testGroupId = group._id.toString()
  })

  // Handover Report
  it('should get handover report as JSON', function (done) {
    agent
      .get(baseUrl + '/api/v2/reports/handover?groupId=' + testGroupId)
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.group).to.equal('TEST')
        expect(res.body.tickets).to.be.a('array')
        done()
      })
  })

  it('should get handover report as markdown', function (done) {
    agent
      .get(baseUrl + '/api/v2/reports/handover?groupId=' + testGroupId + '&format=markdown')
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.markdown).to.be.a('string')
        expect(res.body.markdown).to.contain('Uebergabe-Bericht')
        done()
      })
  })

  it('should return 400 without groupId', function (done) {
    agent
      .get(baseUrl + '/api/v2/reports/handover')
      .end(function (_err, res) {
        expect(res.status).to.equal(400)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should return 404 for non-existent group', function (done) {
    agent
      .get(baseUrl + '/api/v2/reports/handover?groupId=000000000000000000000000')
      .end(function (_err, res) {
        expect(res.status).to.equal(404)
        expect(res.body.success).to.be.false
        done()
      })
  })

  // Sitzungs Report
  it('should get sitzung report as JSON', function (done) {
    const since = new Date()
    since.setDate(since.getDate() - 30)

    agent
      .get(baseUrl + '/api/v2/reports/sitzung?since=' + since.toISOString())
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.summary).to.be.a('object')
        expect(res.body.summary).to.have.property('totalOpened')
        expect(res.body.summary).to.have.property('totalClosed')
        expect(res.body.opened).to.be.a('object')
        expect(res.body.closed).to.be.a('object')
        done()
      })
  })

  it('should get sitzung report as markdown', function (done) {
    const since = new Date()
    since.setDate(since.getDate() - 30)

    agent
      .get(baseUrl + '/api/v2/reports/sitzung?since=' + since.toISOString() + '&format=markdown')
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.markdown).to.be.a('string')
        expect(res.body.markdown).to.contain('OV-Sitzungs-Bericht')
        expect(res.body.markdown).to.contain('Zusammenfassung')
        done()
      })
  })

  it('should return 400 without since parameter', function (done) {
    agent
      .get(baseUrl + '/api/v2/reports/sitzung')
      .end(function (_err, res) {
        expect(res.status).to.equal(400)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should return 400 for invalid date', function (done) {
    agent
      .get(baseUrl + '/api/v2/reports/sitzung?since=not-a-date')
      .end(function (_err, res) {
        expect(res.status).to.equal(400)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should reject unauthenticated requests', function (done) {
    const unauthAgent = superagent.agent()
    unauthAgent
      .get(baseUrl + '/api/v2/reports/handover?groupId=' + testGroupId)
      .end(function (_err, res) {
        expect(res.status).to.not.equal(200)
        done()
      })
  })
})
