/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

describe('api/assets.js', function () {
  const agent = superagent.agent()
  let createdAssetId
  const baseUrl = 'http://localhost:3111'

  before(async function () {
    const Asset = require('../../src/models/asset')
    await Asset.ensureIndexes()

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
          expect(res.status).to.equal(200)
          resolve()
        })
    })
  })

  it('should create an asset via API', function (done) {
    agent
      .post(baseUrl + '/api/v2/assets')
      .type('json')
      .send({
        name: 'MTW',
        assetTag: 'THW-FZ-API-001',
        category: 'Fahrzeug',
        location: 'Fahrzeughalle',
        description: 'Mannschaftstransportwagen'
      })
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.asset).to.be.a('object')
        expect(res.body.asset.name).to.equal('MTW')
        expect(res.body.asset.assetTag).to.equal('THW-FZ-API-001')
        createdAssetId = res.body.asset._id
        done()
      })
  })

  it('should reject duplicate assetTag', function (done) {
    agent
      .post(baseUrl + '/api/v2/assets')
      .type('json')
      .send({
        name: 'Another MTW',
        assetTag: 'THW-FZ-API-001',
        category: 'Fahrzeug'
      })
      .end(function (err, res) {
        // superagent treats 4xx as errors, check res from err
        const response = res || (err && err.response)
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
        done()
      })
  })

  it('should get all assets', function (done) {
    agent
      .get(baseUrl + '/api/v2/assets')
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.assets).to.be.a('array')
        expect(res.body.assets.length).to.be.at.least(1)
        done()
      })
  })

  it('should get a single asset', function (done) {
    agent
      .get(baseUrl + '/api/v2/assets/' + createdAssetId)
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.asset).to.be.a('object')
        expect(res.body.asset.name).to.equal('MTW')
        done()
      })
  })

  it('should return 404 for non-existent asset', function (done) {
    agent
      .get(baseUrl + '/api/v2/assets/000000000000000000000000')
      .end(function (_err, res) {
        expect(res.status).to.equal(404)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should update an asset', function (done) {
    agent
      .put(baseUrl + '/api/v2/assets/' + createdAssetId)
      .type('json')
      .send({ location: 'Werkstatt' })
      .end(function (err, res) {
        if (err) return done(err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.asset.location).to.equal('Werkstatt')
        done()
      })
  })

  it('should link a ticket to an asset', async function () {
    const tickettype = require('../../src/models/tickettype')
    const groupSchema = require('../../src/models/group')
    const prioritySchema = require('../../src/models/ticketpriority')

    const type = await tickettype.getTypeByName('Task')
    const group = await groupSchema.getGroupByName('TEST')
    const priority = await prioritySchema.findOne({ default: true })

    const ticketRes = await agent
      .post(baseUrl + '/api/v1/tickets/create')
      .set('accesstoken', 'da39a3ee5e6b4b0d3255bfef95601890afd80709')
      .type('json')
      .send({
        subject: 'MTW Defekt',
        issue: 'Bremsen defekt',
        type: type._id.toString(),
        group: group._id.toString(),
        priority: priority._id.toString(),
        tags: []
      })

    expect(ticketRes.status).to.equal(200)
    const ticketUid = ticketRes.body.ticket.uid

    const res = await agent
      .post(baseUrl + '/api/v2/assets/' + createdAssetId + '/link-ticket')
      .type('json')
      .send({ ticketUid })

    expect(res.status).to.equal(200)
    expect(res.body.success).to.be.true
    expect(res.body.asset.tickets).to.be.a('array')
    expect(res.body.asset.tickets.length).to.be.at.least(1)
  })

  it('should delete an asset', function (done) {
    agent
      .delete(baseUrl + '/api/v2/assets/' + createdAssetId)
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
      .get(baseUrl + '/api/v2/assets')
      .end(function (_err, res) {
        expect(res.status).to.not.equal(200)
        done()
      })
  })
})
