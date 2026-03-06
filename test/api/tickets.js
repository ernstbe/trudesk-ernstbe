/* eslint-disable no-unused-expressions */
var expect = require('chai').expect
var request = require('supertest')

describe('api/tickets.js', function () {
  var tdapikey = 'da39a3ee5e6b4b0d3255bfef95601890afd80709'
  var api = request('http://localhost:3111')
  var createdTicketId
  var createdTicketUid

  before(async function () {
    // Ensure the admin user is in the TEST group so ticket creation works
    var groupSchema = require('../../src/models/group')
    var userSchema = require('../../src/models/user')
    var user = await userSchema.getUserByUsername('trudesk')
    var group = await groupSchema.getGroupByName('TEST')
    if (!group.isMember(user._id)) {
      await group.addMember(user._id)
    }
  })

  it('should create a ticket via API', async function () {
    var tickettype = require('../../src/models/tickettype')
    var groupSchema = require('../../src/models/group')
    var prioritySchema = require('../../src/models/ticketpriority')

    var type = await tickettype.getTypeByName('Task')
    expect(type).to.be.a('object')
    var group = await groupSchema.getGroupByName('TEST')
    expect(group).to.be.a('object')
    var priority = await prioritySchema.findOne({ default: true })
    expect(priority).to.be.a('object')

    var ticket = {
      subject: 'API Test Ticket',
      issue: 'This is a test issue created via API',
      type: type._id.toString(),
      group: group._id.toString(),
      priority: priority._id.toString(),
      tags: []
    }

    var res = await api
      .post('/api/v1/tickets/create')
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send(ticket)

    if (res.status !== 200) {
      throw new Error('Ticket creation failed: ' + JSON.stringify(res.body))
    }
    expect(res.body.success).to.be.true
    expect(res.body.ticket).to.be.a('object')
    expect(res.body.ticket.subject).to.equal('API Test Ticket')
    createdTicketId = res.body.ticket._id
    createdTicketUid = res.body.ticket.uid
  })

  it('should get tickets via API', function (done) {
    api
      .get('/api/v1/tickets')
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body).to.be.a('array')
      })
      .end(done)
  })

  it('should get a single ticket via API', function (done) {
    api
      .get('/api/v1/tickets/' + createdTicketUid)
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
        expect(res.body.ticket).to.be.a('object')
        expect(res.body.ticket.uid).to.equal(createdTicketUid)
      })
      .end(done)
  })

  it('should update a ticket via API', function (done) {
    api
      .put('/api/v1/tickets/' + createdTicketId)
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send({ subject: 'Updated API Test Ticket' })
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
      })
      .end(done)
  })

  it('should add a comment to a ticket', function (done) {
    api
      .post('/api/v1/tickets/addcomment')
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send({ comment: 'This is a test comment via API', _id: createdTicketId })
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
      })
      .end(done)
  })

  it('should get ticket types', function (done) {
    api
      .get('/api/v1/tickets/types')
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body).to.be.a('array')
        expect(res.body.length).to.be.at.least(1)
      })
      .end(done)
  })

  it('should get ticket priorities', function (done) {
    api
      .get('/api/v1/tickets/priorities')
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
        expect(res.body.priorities).to.be.a('array')
        expect(res.body.priorities.length).to.be.at.least(1)
      })
      .end(done)
  })

  it('should get ticket statuses', function (done) {
    api
      .get('/api/v1/tickets/status')
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
        expect(res.body.status).to.be.a('array')
        expect(res.body.status.length).to.be.at.least(1)
      })
      .end(done)
  })

  it('should reject ticket creation without required fields', function (done) {
    api
      .post('/api/v1/tickets/create')
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send({})
      .expect(400, done)
  })

  it('should delete a ticket via API', function (done) {
    api
      .delete('/api/v1/tickets/' + createdTicketId)
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
      })
      .end(done)
  })
})
