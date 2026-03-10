/* eslint-disable no-unused-expressions */
/* globals server */
const request = require('supertest')

describe('api/api.js', function () {
  it('should return 401 for failed login', function (done) {
    const user = { username: 'test', password: '' }
    request(server)
      .post('/api/v1/login')
      .send(user)
      .expect(401, done)
  })

  it('should login', function (done) {
    const user = { username: 'trudesk', password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW' }
    request(server)
      .post('/api/v1/login')
      .send(user)
      .expect(200, done)
  })

  // it('should have access token', function(done) {
  //    var userSchema = require('../../src/models/user');
  //    userSchema.getUserByUsername('trudesk', function(err, user) {
  //        expect(err).to.not.exist;
  //        expect(user).to.be.a('object');
  //        expect(user.accessToken).to.exist;
  //
  //        done();
  //    });
  // });

  it("should return a 404 error ('/api/404')", function (done) {
    request(server)
      .get('/api/404')
      .expect(404, done)
  })

  it('should allow accessToken', function (done) {
    request(server)
      .get('/api/v1/tickets/1000')
      .set('accesstoken', 'da39a3ee5e6b4b0d3255bfef95601890afd80709')
      .expect(200, done)
  })

  it('should error Invalid Access Token', function (done) {
    request(server)
      .get('/api/v1/tickets/1000')
      .set('accesstoken', '1')
      .expect(401, done)
  })
})
