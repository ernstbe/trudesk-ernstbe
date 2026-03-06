/* eslint-disable no-unused-expressions */
var expect = require('chai').expect
var request = require('supertest')

describe('api/groups.js', function () {
  var tdapikey = 'da39a3ee5e6b4b0d3255bfef95601890afd80709'
  var api = request('http://localhost:3111')
  var createdGroupId

  it('should get all groups', function (done) {
    api
      .get('/api/v1/groups')
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
        expect(res.body.groups).to.be.a('array')
      })
      .end(done)
  })

  it('should create a group', function (done) {
    api
      .post('/api/v1/groups/create')
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send({ name: 'API Test Group', members: [], sendMailTo: [] })
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
        expect(res.body.group).to.be.a('object')
        expect(res.body.group.name).to.equal('API Test Group')
        createdGroupId = res.body.group._id
      })
      .end(done)
  })

  it('should get a single group', function (done) {
    api
      .get('/api/v1/groups/' + createdGroupId)
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
        expect(res.body.group).to.be.a('object')
      })
      .end(done)
  })

  it('should update a group', function (done) {
    api
      .put('/api/v1/groups/' + createdGroupId)
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send({ name: 'Updated API Test Group', members: [], sendMailTo: [] })
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
      })
      .end(done)
  })

  it('should reject group creation without name', function (done) {
    api
      .post('/api/v1/groups/create')
      .set('accesstoken', tdapikey)
      .set('Content-Type', 'application/json')
      .send({})
      .expect(400, done)
  })

  it('should delete a group', function (done) {
    api
      .delete('/api/v1/groups/' + createdGroupId)
      .set('accesstoken', tdapikey)
      .expect(200)
      .expect(function (res) {
        expect(res.body.success).to.be.true
      })
      .end(done)
  })
})
