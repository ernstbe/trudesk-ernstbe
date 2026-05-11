/* eslint-disable no-unused-expressions */
/* globals server */
const request = require('supertest')
const { expect } = require('chai')

/**
 * Token-rotation-on-logout test for the fix in PR #45.
 *
 * The v1 accessToken never expired and was never invalidated. After this
 * PR, GET /api/v1/logout rotates the user's accessToken so a leaked
 * localStorage entry actually becomes dead.
 */
describe('api/v1/logout token rotation', function () {
  it('rotates the user accessToken on logout', async function () {
    const userSchema = require('../../src/models/user')

    // Snapshot the deleted-user fixture's token (created in 0_database.js
    // with accessToken: '123'). The fixture is the cleanest target — it
    // won't interfere with other tests because it's flagged deleted=false
    // is needed for the auth middleware to accept the token... actually
    // 'deleted.user' has deleted=true. Use the support user 'fake.user'
    // with accessToken '456' instead.
    const before = await userSchema.findOne({ username: 'fake.user' }).select('+accessToken')
    expect(before, 'fixture user exists').to.exist
    expect(before.accessToken, 'fixture has known accessToken').to.equal('456')

    await request(server)
      .get('/api/v1/logout')
      .set('accesstoken', '456')
      .expect(200)

    const after = await userSchema.findOne({ username: 'fake.user' }).select('+accessToken')
    expect(after.accessToken, 'token was rotated').to.not.equal('456')
    expect(after.accessToken, 'new token is a non-empty string').to.be.a('string').and.not.empty

    // The OLD token must be rejected by the api middleware now.
    await request(server)
      .get('/api/v1/tickets/1000')
      .set('accesstoken', '456')
      .expect(401)

    // The NEW token must work.
    await request(server)
      .get('/api/v1/tickets/1000')
      .set('accesstoken', after.accessToken)
      .expect(200)
  })
})
