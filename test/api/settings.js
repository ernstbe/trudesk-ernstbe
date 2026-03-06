/* eslint-disable no-unused-expressions */
var expect = require('chai').expect
var request = require('supertest')

describe('api/settings.js', function () {
  var tdapikey = 'da39a3ee5e6b4b0d3255bfef95601890afd80709'
  var api = request('http://localhost:3111')

  it('should get all settings', function (done) {
    api
      .get('/api/v1/settings')
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
        expect(res.body.settings).to.be.a('object')
      })
      .end(done)
  })

  it('should update a setting', function (done) {
    api
      .put('/api/v1/settings')
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send({ name: 'gen:sitetitle', value: 'Test Trudesk' })
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
      })
      .end(done)
  })

  it('should reject setting update without name', function (done) {
    api
      .put('/api/v1/settings')
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send({ value: 'test' })
      .expect(400, done)
  })

  it('should get roles', function (done) {
    api
      .get('/api/v1/roles')
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
        expect(res.body.roles).to.be.a('array')
        expect(res.body.roles.length).to.be.at.least(3)
      })
      .end(done)
  })
})
