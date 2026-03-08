/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

describe('api/documents.js', function () {
  const agent = superagent.agent()
  let createdDocumentId
  const baseUrl = 'http://localhost:3111'

  before(async function () {
    const Document = require('../../src/models/document')
    await Document.ensureIndexes()

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

  it('should create a document via JSON', function (done) {
    agent
      .post(baseUrl + '/api/v2/documents')
      .type('json')
      .send({
        name: 'Dienstanweisung Funk',
        description: 'Anweisung zur Nutzung der Funkgeraete',
        category: 'Dienstanweisung',
        originalFilename: 'dienstanweisung_funk.pdf',
        mimetype: 'application/pdf',
        size: 12345
      })
      .end(function (_err, res) {
        if (_err) return done(_err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.document).to.be.a('object')
        expect(res.body.document.name).to.equal('Dienstanweisung Funk')
        expect(res.body.document.category).to.equal('Dienstanweisung')
        expect(res.body.document.originalFilename).to.equal('dienstanweisung_funk.pdf')
        createdDocumentId = res.body.document._id
        done()
      })
  })

  it('should reject document creation without name', function (done) {
    agent
      .post(baseUrl + '/api/v2/documents')
      .type('json')
      .send({
        description: 'Missing name field'
      })
      .end(function (_err, res) {
        const response = res || (_err && _err.response)
        expect(response.status).to.equal(400)
        expect(response.body.success).to.be.false
        done()
      })
  })

  it('should get all documents', function (done) {
    agent
      .get(baseUrl + '/api/v2/documents')
      .end(function (_err, res) {
        if (_err) return done(_err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.documents).to.be.a('array')
        expect(res.body.documents.length).to.be.at.least(1)
        done()
      })
  })

  it('should get a single document', function (done) {
    agent
      .get(baseUrl + '/api/v2/documents/' + createdDocumentId)
      .end(function (_err, res) {
        if (_err) return done(_err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.document).to.be.a('object')
        expect(res.body.document.name).to.equal('Dienstanweisung Funk')
        done()
      })
  })

  it('should return 404 for non-existent document', function (done) {
    agent
      .get(baseUrl + '/api/v2/documents/000000000000000000000000')
      .end(function (_err, res) {
        expect(res.status).to.equal(404)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should update a document', function (done) {
    agent
      .put(baseUrl + '/api/v2/documents/' + createdDocumentId)
      .type('json')
      .send({
        name: 'Dienstanweisung Funk v2',
        category: 'Protokoll'
      })
      .end(function (_err, res) {
        if (_err) return done(_err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        expect(res.body.document.name).to.equal('Dienstanweisung Funk v2')
        expect(res.body.document.category).to.equal('Protokoll')
        done()
      })
  })

  it('should create a second document for deletion test', function (done) {
    agent
      .post(baseUrl + '/api/v2/documents')
      .type('json')
      .send({
        name: 'Temp Document',
        description: 'To be deleted',
        category: 'Sonstiges'
      })
      .end(function (_err, res) {
        if (_err) return done(_err)
        expect(res.status).to.equal(200)
        expect(res.body.success).to.be.true
        // Delete this one
        agent
          .delete(baseUrl + '/api/v2/documents/' + res.body.document._id)
          .end(function (_err2, res2) {
            if (_err2) return done(_err2)
            expect(res2.status).to.equal(200)
            expect(res2.body.success).to.be.true
            done()
          })
      })
  })

  it('should return 404 when deleting non-existent document', function (done) {
    agent
      .delete(baseUrl + '/api/v2/documents/000000000000000000000000')
      .end(function (_err, res) {
        expect(res.status).to.equal(404)
        expect(res.body.success).to.be.false
        done()
      })
  })

  it('should reject unauthenticated requests', function (done) {
    const unauthAgent = superagent.agent()
    unauthAgent
      .get(baseUrl + '/api/v2/documents')
      .end(function (_err, res) {
        expect(res.status).to.not.equal(200)
        done()
      })
  })
})
