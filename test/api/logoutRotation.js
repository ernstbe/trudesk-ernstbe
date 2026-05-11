/* eslint-disable no-unused-expressions */
/* globals server */
const request = require('supertest')
const { expect } = require('chai')

/**
 * Per-device token tests. The previous single-token model meant any
 * leaked accessToken was permanent and any logout/rotation kicked every
 * device the user was signed in on. The model now stores an
 * `accessTokens` array keyed by client-supplied `deviceId`; login
 * mints/rotates only that device's slot, and logout removes only the
 * current request's token. The legacy single `accessToken` field is
 * still accepted on auth so old PWA installs don't break on deploy.
 */
describe('api/v1 per-device token model', function () {
  const userSchema = require('../../src/models/user')

  it('logout removes the current device token but not others', async function () {
    // Seed two device tokens on fake.user (in addition to the legacy '456').
    const user = await userSchema.findOne({ username: 'fake.user' }).select('+accessTokens')
    user.accessTokens = [
      { token: 'tok-phone', deviceId: 'phone-1', createdAt: new Date(), lastUsedAt: new Date() },
      { token: 'tok-desktop', deviceId: 'desktop-1', createdAt: new Date(), lastUsedAt: new Date() }
    ]
    await user.save()

    // Both should authenticate.
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-phone').expect(200)
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-desktop').expect(200)

    // Logout on the phone.
    await request(server).get('/api/v1/logout').set('accesstoken', 'tok-phone').expect(200)

    // Phone token is dead, desktop still works.
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-phone').expect(401)
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-desktop').expect(200)

    // DB reflects the surgical removal.
    const after = await userSchema.findOne({ username: 'fake.user' }).select('+accessTokens')
    const tokens = after.accessTokens.map((t) => t.token)
    expect(tokens).to.not.include('tok-phone')
    expect(tokens).to.include('tok-desktop')
  })

  it('login on the same deviceId rotates that slot only', async function () {
    // Reset to a known per-device state.
    const seed = await userSchema.findOne({ username: 'fake.user' }).select('+accessTokens')
    seed.accessTokens = [
      { token: 'tok-rotateme', deviceId: 'dev-rot', createdAt: new Date(), lastUsedAt: new Date() },
      { token: 'tok-untouched', deviceId: 'dev-other', createdAt: new Date(), lastUsedAt: new Date() }
    ]
    await seed.save()

    const loginRes = await request(server)
      .post('/api/v1/login')
      // The fixture's "password" is the hashed string seeded in 0_database.js,
      // re-hashed by the userSchema pre-save hook. See test/api/api.js for the
      // pattern.
      .send({
        username: 'fake.user',
        password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
        deviceId: 'dev-rot'
      })
      .expect(200)
    expect(loginRes.body.success, 'login success').to.be.true
    const newToken = loginRes.body.accessToken
    expect(newToken).to.be.a('string').and.not.empty
    expect(newToken).to.not.equal('tok-rotateme')

    // Old token for that device is dead, the other device is untouched,
    // and the new token works.
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-rotateme').expect(401)
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-untouched').expect(200)
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', newToken).expect(200)
  })

  it('accepts the legacy single accessToken field for backward compat', async function () {
    // Pre-migration accounts still have the legacy '456' field on the
    // fake.user fixture (and per-device entries may or may not exist).
    // The auth middleware must match either.
    const user = await userSchema.findOne({ username: 'fake.user' }).select('+accessToken +accessTokens')
    // Restore the legacy field if a prior test cleared it.
    if (!user.accessToken) {
      user.accessToken = '456'
      await user.save()
    }

    await request(server).get('/api/v1/tickets/1000').set('accesstoken', '456').expect(200)
  })
})
