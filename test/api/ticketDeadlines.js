/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

describe('api/ticketDeadlines.js', function () {
  const agent = superagent.agent()
  const baseUrl = 'http://localhost:3111'
  let testTicketUid

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

        // Create a test ticket with a due date
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
          const type = results[0]
          const group = results[1]
          const priority = results[2]
          const user = results[3]
          const status = results[4]

          const pastDate = new Date()
          pastDate.setDate(pastDate.getDate() - 5)

          Ticket.create({
            owner: user._id,
            group: group._id,
            type: type._id,
            status: status._id,
            priority: priority._id,
            subject: 'Deadline Test Ticket',
            issue: 'Testing deadline feature',
            dueDate: pastDate
          }).then(function (ticket) {
            testTicketUid = ticket.uid
            done()
          }).catch(done)
        }).catch(done)
      })
  })

  it('should get deadline status for a ticket with dueDate', function (done) {
    agent
      .get(baseUrl + '/api/v2/tickets/' + testTicketUid + '/deadline')
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.deadline).to.be.a('object')
        expect(res.body.deadline.status).to.equal('overdue')
        expect(res.body.deadline.daysRemaining).to.be.below(0)
        done()
      })
  })

  it('should return null deadline for ticket without dueDate', function (done) {
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
        subject: 'No Deadline Ticket',
        issue: 'No due date set'
      }).then(function (ticket) {
        agent
          .get(baseUrl + '/api/v2/tickets/' + ticket.uid + '/deadline')
          .end(function (_err, res) {
            expect(res.status).to.equal(200)
            expect(res.body.success).to.be.true
            expect(res.body.deadline).to.be.null
            done()
          })
      }).catch(done)
    }).catch(done)
  })

  it('should get overdue tickets', function (done) {
    agent
      .get(baseUrl + '/api/v2/tickets/overdue')
      .end(function (_err, res) {
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.tickets).to.be.a('array')
        expect(res.body.tickets.length).to.be.at.least(1)
        expect(res.body.count).to.be.at.least(1)

        const overdueTicket = res.body.tickets[0]
        expect(overdueTicket.deadline).to.be.a('object')
        expect(overdueTicket.deadline.status).to.equal('overdue')
        done()
      })
  })

  it('should return 404 for non-existent ticket deadline', function (done) {
    agent
      .get(baseUrl + '/api/v2/tickets/999999/deadline')
      .end(function (_err, res) {
        expect(res.status).to.equal(404)
        expect(res.body.success).to.be.false
        done()
      })
  })
})
