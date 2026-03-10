/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

describe('api/ticketChecklists.js', function () {
  const agent = superagent.agent()
  const baseUrl = 'http://localhost:3111'
  let testTicketUid
  let checklistItemId

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

        const tickettype = require('../../src/models/tickettype')
        const groupSchema = require('../../src/models/group')
        const prioritySchema = require('../../src/models/ticketpriority')
        const userSchema = require('../../src/models/user')
        const statusSchema = require('../../src/models/ticketStatus')
        const Ticket = require('../../src/models/ticket')

        Promise.all([
          tickettype.getTypeByName('Task'),
          groupSchema.getGroupByName('TEST'),
          prioritySchema.findOne({ default: true }),
          userSchema.getUserByUsername('trudesk'),
          statusSchema.findOne({ uid: 0 })
        ]).then(function (results) {
          Ticket.create({
            owner: results[3]._id,
            group: results[1]._id,
            type: results[0]._id,
            status: results[4]._id,
            priority: results[2]._id,
            subject: 'Checklist Test Ticket',
            issue: 'Testing checklist feature'
          }).then(function (ticket) {
            testTicketUid = ticket.uid
            done()
          }).catch(done)
        }).catch(done)
      })
  })

  it('should add a checklist item to a ticket', function (done) {
    agent
      .post(baseUrl + '/api/v2/tickets/' + testTicketUid + '/checklist')
      .type('json')
      .send({ title: 'First checklist item' })
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.ticket.checklist).to.be.a('array')
        expect(res.body.ticket.checklist.length).to.equal(1)
        expect(res.body.ticket.checklist[0].title).to.equal('First checklist item')
        expect(res.body.ticket.checklist[0].completed).to.be.false
        checklistItemId = res.body.ticket.checklist[0]._id
        done()
      })
  })

  it('should add a second checklist item', function (done) {
    agent
      .post(baseUrl + '/api/v2/tickets/' + testTicketUid + '/checklist')
      .type('json')
      .send({ title: 'Second checklist item' })
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.ticket.checklist.length).to.equal(2)
        done()
      })
  })

  it('should toggle a checklist item to completed', function (done) {
    agent
      .put(baseUrl + '/api/v2/tickets/' + testTicketUid + '/checklist/' + checklistItemId)
      .type('json')
      .send({ completed: true })
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        const item = res.body.ticket.checklist.find(function (i) {
          return i._id === checklistItemId
        })
        expect(item.completed).to.be.true
        expect(item.completedAt).to.not.be.null
        done()
      })
  })

  it('should update checklist item title', function (done) {
    agent
      .put(baseUrl + '/api/v2/tickets/' + testTicketUid + '/checklist/' + checklistItemId)
      .type('json')
      .send({ title: 'Updated title' })
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        const item = res.body.ticket.checklist.find(function (i) {
          return i._id === checklistItemId
        })
        expect(item.title).to.equal('Updated title')
        done()
      })
  })

  it('should toggle a checklist item back to incomplete', function (done) {
    agent
      .put(baseUrl + '/api/v2/tickets/' + testTicketUid + '/checklist/' + checklistItemId)
      .type('json')
      .send({ completed: false })
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        const item = res.body.ticket.checklist.find(function (i) {
          return i._id === checklistItemId
        })
        expect(item.completed).to.be.false
        done()
      })
  })

  it('should remove a checklist item', function (done) {
    agent
      .delete(baseUrl + '/api/v2/tickets/' + testTicketUid + '/checklist/' + checklistItemId)
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.ticket.checklist.length).to.equal(1)
        done()
      })
  })

  it('should reject adding checklist item without title', function (done) {
    agent
      .post(baseUrl + '/api/v2/tickets/' + testTicketUid + '/checklist')
      .type('json')
      .send({})
      .end(function (_err, res) {
        expect(res.status).to.equal(400)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should return 404 for non-existent ticket', function (done) {
    agent
      .post(baseUrl + '/api/v2/tickets/999999/checklist')
      .type('json')
      .send({ title: 'Test' })
      .end(function (_err, res) {
        expect(res.status).to.equal(404)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should return 404 for non-existent checklist item', function (done) {
    agent
      .put(baseUrl + '/api/v2/tickets/' + testTicketUid + '/checklist/000000000000000000000000')
      .type('json')
      .send({ completed: true })
      .end(function (_err, res) {
        expect(res.status).to.equal(404)
        expect(res.body.success).to.be.false
        done()
      })
  })
})
