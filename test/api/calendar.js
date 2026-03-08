/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

describe('api/calendar.js', function () {
  const agent = superagent.agent()
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
        .end(function (_err, res) {
          if (_err) return reject(_err)
          resolve()
        })
    })
  })

  it('should return events array', function (done) {
    const start = new Date()
    start.setMonth(start.getMonth() - 1)
    const end = new Date()
    end.setMonth(end.getMonth() + 1)

    agent
      .get(baseUrl + '/api/v2/calendar/events?start=' + start.toISOString() + '&end=' + end.toISOString())
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.events).to.be.a('array')
        done()
      })
  })

  it('should filter by date range', function (done) {
    const start = new Date('2000-01-01')
    const end = new Date('2000-01-02')

    agent
      .get(baseUrl + '/api/v2/calendar/events?start=' + start.toISOString() + '&end=' + end.toISOString())
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.events).to.be.a('array')
        expect(res.body.events.length).to.equal(0)
        done()
      })
  })

  it('should return 400 without start and end', function (done) {
    agent
      .get(baseUrl + '/api/v2/calendar/events')
      .end(function (_err, res) {
        expect(res.status).to.equal(400)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should reject unauthenticated requests', function (done) {
    const unauthAgent = superagent.agent()
    const start = new Date()
    const end = new Date()
    end.setMonth(end.getMonth() + 1)

    unauthAgent
      .get(baseUrl + '/api/v2/calendar/events?start=' + start.toISOString() + '&end=' + end.toISOString())
      .end(function (_err, res) {
        expect(res.status).to.not.equal(200)
        done()
      })
  })
})
