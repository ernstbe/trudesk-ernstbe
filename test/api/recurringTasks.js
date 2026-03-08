/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')
const m = require('mongoose')

describe('api/recurringTasks.js', function () {
  const agent = superagent.agent()
  let createdTaskId
  const baseUrl = 'http://localhost:3111'

  before(function (done) {
    agent
      .post(baseUrl + '/login')
      .type('json')
      .send({
        'login-username': 'trudesk',
        'login-password': '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW'
      })
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        done()
      })
  })

  it('should create a recurring task via API', function (done) {
    agent
      .post(baseUrl + '/api/v2/recurring-tasks')
      .type('json')
      .send({
        name: 'API Monatliche Wartung',
        description: 'Wartung der Heizungsanlage',
        ticketSubject: 'Heizungswartung faellig',
        ticketIssue: 'Bitte Heizungswartung durchfuehren',
        ticketType: new m.Types.ObjectId().toString(),
        ticketGroup: new m.Types.ObjectId().toString(),
        ticketPriority: new m.Types.ObjectId().toString(),
        scheduleType: 'monthly',
        dayOfMonth: 1,
        daysBeforeDeadline: 7
      })
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.recurringTask).to.be.a('object')
        expect(res.body.recurringTask.name).to.equal('API Monatliche Wartung')
        expect(res.body.recurringTask.enabled).to.be.true
        createdTaskId = res.body.recurringTask._id
        done()
      })
  })

  it('should get all recurring tasks', function (done) {
    agent
      .get(baseUrl + '/api/v2/recurring-tasks')
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.recurringTasks).to.be.a('array')
        expect(res.body.recurringTasks.length).to.be.at.least(1)
        done()
      })
  })

  it('should get a single recurring task', function (done) {
    agent
      .get(baseUrl + '/api/v2/recurring-tasks/' + createdTaskId)
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.recurringTask.name).to.equal('API Monatliche Wartung')
        done()
      })
  })

  it('should return 404 for non-existent task', function (done) {
    agent
      .get(baseUrl + '/api/v2/recurring-tasks/000000000000000000000000')
      .end(function (_err, res) {
        expect(res.status).to.equal(404)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should update a recurring task', function (done) {
    agent
      .put(baseUrl + '/api/v2/recurring-tasks/' + createdTaskId)
      .type('json')
      .send({
        name: 'API Wartung (aktualisiert)',
        scheduleType: 'quarterly',
        daysBeforeDeadline: 14
      })
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.recurringTask.name).to.equal('API Wartung (aktualisiert)')
        expect(res.body.recurringTask.scheduleType).to.equal('quarterly')
        done()
      })
  })

  it('should disable a recurring task', function (done) {
    agent
      .put(baseUrl + '/api/v2/recurring-tasks/' + createdTaskId)
      .type('json')
      .send({ enabled: false })
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.recurringTask.enabled).to.be.false
        done()
      })
  })

  it('should delete a recurring task', function (done) {
    agent
      .delete(baseUrl + '/api/v2/recurring-tasks/' + createdTaskId)
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        done()
      })
  })

  it('should reject unauthenticated requests', function (done) {
    const unauthAgent = superagent.agent()
    unauthAgent
      .get(baseUrl + '/api/v2/recurring-tasks')
      .end(function (_err, res) {
        expect(res.status).to.not.equal(200)
        done()
      })
  })
})
