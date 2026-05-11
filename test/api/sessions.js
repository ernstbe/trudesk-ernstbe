/* eslint-disable no-unused-expressions */
/* globals server */
const request = require('supertest')
const { expect } = require('chai')

/**
 * Phase 3: sessions API
 *   GET    /api/v1/account/sessions               -> list
 *   DELETE /api/v1/account/sessions               -> revoke all except current
 *   DELETE /api/v1/account/sessions/:deviceId     -> revoke one
 */
describe('api/v1/account/sessions', function () {
  const userSchema = require('../../src/models/user')

  async function seedFakeUserSessions () {
    const user = await userSchema.findOne({ username: 'fake.user' }).select('+accessToken +accessTokens')
    user.accessToken = '456'
    user.accessTokens = [
      { token: 'tok-phone', deviceId: 'phone-1', userAgent: 'Phone UA', createdAt: new Date(), lastUsedAt: new Date() },
      { token: 'tok-desktop', deviceId: 'desktop-1', userAgent: 'Desktop UA', createdAt: new Date(), lastUsedAt: new Date() },
      { token: 'tok-tablet', deviceId: 'tablet-1', userAgent: 'Tablet UA', createdAt: new Date(), lastUsedAt: new Date() }
    ]
    await user.save()
  }

  it('GET /sessions returns the current user\'s entries with isCurrent flag', async function () {
    await seedFakeUserSessions()

    const res = await request(server)
      .get('/api/v1/account/sessions')
      .set('accesstoken', 'tok-phone')
      .expect(200)

    expect(res.body.success).to.be.true
    expect(res.body.sessions).to.be.an('array').with.length.at.least(3)
    const phone = res.body.sessions.find((s) => s.deviceId === 'phone-1')
    expect(phone).to.exist
    expect(phone.isCurrent).to.be.true
    expect(phone.userAgent).to.equal('Phone UA')
    expect(phone).to.not.have.property('token') // never leak token values

    const desktop = res.body.sessions.find((s) => s.deviceId === 'desktop-1')
    expect(desktop.isCurrent).to.be.false

    // Legacy entry surfaces too.
    const legacy = res.body.sessions.find((s) => s.isLegacy)
    expect(legacy).to.exist
  })

  it('GET /sessions rejects unauthenticated requests', async function () {
    await request(server).get('/api/v1/account/sessions').expect(401)
  })

  it('DELETE /sessions/:deviceId removes that single entry', async function () {
    await seedFakeUserSessions()

    await request(server)
      .delete('/api/v1/account/sessions/tablet-1')
      .set('accesstoken', 'tok-phone')
      .expect(200)

    // tablet token no longer authenticates.
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-tablet').expect(401)
    // phone (the requester) and desktop are intact.
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-phone').expect(200)
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-desktop').expect(200)
  })

  it('DELETE /sessions/:deviceId returns 404 for unknown deviceId', async function () {
    await seedFakeUserSessions()

    await request(server)
      .delete('/api/v1/account/sessions/does-not-exist')
      .set('accesstoken', 'tok-phone')
      .expect(404)
  })

  it('DELETE /sessions revokes everything except the current token', async function () {
    await seedFakeUserSessions()

    await request(server)
      .delete('/api/v1/account/sessions')
      .set('accesstoken', 'tok-desktop')
      .expect(200)

    // Current device still works.
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-desktop').expect(200)
    // Everything else dead.
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-phone').expect(401)
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', 'tok-tablet').expect(401)
    await request(server).get('/api/v1/tickets/1000').set('accesstoken', '456').expect(401)

    // DB reflects the state.
    const after = await userSchema.findOne({ username: 'fake.user' }).select('+accessToken +accessTokens')
    expect(after.accessTokens).to.have.lengthOf(1)
    expect(after.accessTokens[0].token).to.equal('tok-desktop')
    expect(after.accessToken).to.be.undefined
  })

  it('users cannot revoke another user\'s sessions', async function () {
    // Set up two users with overlapping deviceIds.
    const fake = await userSchema.findOne({ username: 'fake.user' }).select('+accessToken +accessTokens')
    fake.accessTokens = [
      { token: 'fake-only', deviceId: 'shared-id', createdAt: new Date(), lastUsedAt: new Date() }
    ]
    await fake.save()

    const admin = await userSchema.findOne({ username: 'trudesk' }).select('+accessToken +accessTokens')
    admin.accessTokens = [
      { token: 'admin-current', deviceId: 'admin-dev', createdAt: new Date(), lastUsedAt: new Date() }
    ]
    await admin.save()

    // Admin tries to revoke fake.user's deviceId — should fail (no
    // session by that id on the ADMIN's account), and fake's session
    // must survive.
    await request(server)
      .delete('/api/v1/account/sessions/shared-id')
      .set('accesstoken', 'admin-current')
      .expect(404)

    const stillThere = await userSchema.findOne({ username: 'fake.user' }).select('+accessTokens')
    expect(stillThere.accessTokens.some((t) => t.deviceId === 'shared-id')).to.be.true
  })
})
