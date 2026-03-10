/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')
const m = require('mongoose')

describe('api/ticketTemplates.js', function () {
  const agent = superagent.agent()
  let createdTemplateId
  const baseUrl = 'http://localhost:3111'

  before(function (done) {
    agent
      .post(baseUrl + '/login')
      .type('json')
      .send({
        'login-username': 'trudesk',
        'login-password': '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW'
      })
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        done()
      })
  })

  it('should create a ticket template via API', function (done) {
    agent
      .post(baseUrl + '/api/v2/ticket-templates')
      .type('json')
      .send({
        name: 'API Test Template',
        subject: 'Test Subject Template',
        issue: 'Test Issue Template',
        ticketType: new m.Types.ObjectId().toString(),
        group: new m.Types.ObjectId().toString(),
        priority: new m.Types.ObjectId().toString()
      })
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.ticketTemplate).to.be.a('object')
        expect(res.body.ticketTemplate.name).to.equal('API Test Template')
        expect(res.body.ticketTemplate.subject).to.equal('Test Subject Template')
        createdTemplateId = res.body.ticketTemplate._id
        done()
      })
  })

  it('should get all ticket templates', function (done) {
    agent
      .get(baseUrl + '/api/v2/ticket-templates')
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.ticketTemplates).to.be.a('array')
        expect(res.body.ticketTemplates.length).to.be.at.least(1)
        done()
      })
  })

  it('should get a single ticket template', function (done) {
    agent
      .get(baseUrl + '/api/v2/ticket-templates/' + createdTemplateId)
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.ticketTemplate.name).to.equal('API Test Template')
        done()
      })
  })

  it('should return 404 for non-existent template', function (done) {
    agent
      .get(baseUrl + '/api/v2/ticket-templates/000000000000000000000000')
      .end(function (_err, res) {
        expect(res.status).to.equal(404)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should update a ticket template', function (done) {
    agent
      .put(baseUrl + '/api/v2/ticket-templates/' + createdTemplateId)
      .type('json')
      .send({
        name: 'Updated Template',
        subject: 'Updated Subject'
      })
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.ticketTemplate.name).to.equal('Updated Template')
        expect(res.body.ticketTemplate.subject).to.equal('Updated Subject')
        done()
      })
  })

  it('should delete a ticket template', function (done) {
    agent
      .delete(baseUrl + '/api/v2/ticket-templates/' + createdTemplateId)
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        done()
      })
  })

  it('should reject unauthenticated requests', function (done) {
    const unauthAgent = superagent.agent()
    unauthAgent
      .get(baseUrl + '/api/v2/ticket-templates')
      .end(function (_err, res) {
        expect(res.status).to.not.equal(200)
        done()
      })
  })
})
