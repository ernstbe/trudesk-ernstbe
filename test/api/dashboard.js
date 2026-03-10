/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

describe('api/dashboard.js', function () {
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
          expect(res.status).to.equal(200)
          resolve()
        })
    })
  })

  it('should get dashboard widgets', function (done) {
    agent
      .get(baseUrl + '/api/v2/dashboard/widgets')
      .end(function (_err, res) {
        if (_err) return done(_err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.widgets).to.be.a('object')
        expect(res.body.widgets).to.have.property('beschluesse')
        expect(res.body.widgets).to.have.property('recurringTasks')
        expect(res.body.widgets).to.have.property('assets')
        expect(res.body.widgets).to.have.property('overdue')
        expect(res.body.widgets.beschluesse).to.be.a('number')
        expect(res.body.widgets.recurringTasks).to.be.a('array')
        expect(res.body.widgets.assets).to.be.a('object')
        expect(res.body.widgets.assets).to.have.property('total')
        expect(res.body.widgets.assets).to.have.property('byCategory')
        expect(res.body.widgets.overdue).to.be.a('number')
        done()
      })
  })

  it('should reject unauthenticated requests', function (done) {
    const unauthAgent = superagent.agent()
    unauthAgent
      .get(baseUrl + '/api/v2/dashboard/widgets')
      .end(function (_err, res) {
        expect(res.status).to.not.equal(200)
        done()
      })
  })
})
