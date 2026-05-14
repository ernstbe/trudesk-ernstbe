/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

const userSchema = require('../../src/models/user')
const roleSchema = require('../../src/models/role')
const webpush = require('../../src/webpush')
const NotificationSchema = require('../../src/models/notification')

// Integration coverage for Phase 1 of Web Push.
// The webpush module must be initialized first (the test bootstrap doesn't
// call it — production wires it from `app.js`). Once initialized, the
// subscribe/unsubscribe HTTP endpoints round-trip a subscription on the
// authenticated user, and the post-save hook on Notification fans out
// to webpush.sendToUser without throwing even when no subscriptions exist.
describe('web push: VAPID + subscription CRUD + post-save fan-out', function () {
  const baseUrl = 'http://localhost:3111'
  const agent = superagent.agent()
  let createdUser
  let accessToken

  before(async function () {
    await webpush.init()
    expect(webpush.isInitialized(), 'webpush initialized').to.equal(true)
    expect(webpush.getPublicKey(), 'public key available').to.be.a('string').and.not.empty

    const supportRole = (await roleSchema.getRoles()).find(r => r.normalized === 'support')
    createdUser = await userSchema.create({
      username: 'webpush.test',
      password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
      fullname: 'WebPush Test',
      email: 'webpush.test@trudesk.io',
      role: supportRole._id,
      accessToken: 'webpush-test-token'
    })
    accessToken = 'webpush-test-token'
  })

  after(async function () {
    if (createdUser) await userSchema.deleteOne({ _id: createdUser._id })
  })

  it('GET /vapid-public returns the public key', async function () {
    const res = await agent
      .get(baseUrl + '/api/v1/account/push/vapid-public')
      .set('accesstoken', accessToken)
    expect(res.body.success).to.equal(true)
    expect(res.body.publicKey).to.equal(webpush.getPublicKey())
  })

  it('POST /subscribe stores a new subscription and is idempotent on endpoint', async function () {
    const sub = {
      endpoint: 'https://fcm.example.test/sub/1',
      keys: { p256dh: 'fake-p256dh', auth: 'fake-auth' },
      deviceId: 'device-A',
      userAgent: 'IntegrationTest/1.0'
    }
    const first = await agent.post(baseUrl + '/api/v1/account/push/subscribe')
      .set('accesstoken', accessToken).send(sub)
    expect(first.body.success).to.equal(true)

    // Second POST with same endpoint must not duplicate.
    const second = await agent.post(baseUrl + '/api/v1/account/push/subscribe')
      .set('accesstoken', accessToken)
      .send({ ...sub, userAgent: 'IntegrationTest/2.0' })
    expect(second.body.success).to.equal(true)

    const fresh = await userSchema.findById(createdUser._id).select('+pushSubscriptions')
    const matching = fresh.pushSubscriptions.filter(s => s.endpoint === sub.endpoint)
    expect(matching).to.have.lengthOf(1)
    expect(matching[0].userAgent).to.equal('IntegrationTest/2.0')
  })

  it('POST /subscribe rejects missing keys', async function () {
    try {
      await agent.post(baseUrl + '/api/v1/account/push/subscribe')
        .set('accesstoken', accessToken)
        .send({ endpoint: 'https://example.test/oops' })
      throw new Error('should not reach here')
    } catch (err) {
      expect(err.response.status).to.equal(400)
    }
  })

  it('DELETE /subscribe removes the subscription', async function () {
    const res = await agent.delete(baseUrl + '/api/v1/account/push/subscribe')
      .set('accesstoken', accessToken)
      .send({ endpoint: 'https://fcm.example.test/sub/1' })
    expect(res.body.success).to.equal(true)

    const fresh = await userSchema.findById(createdUser._id).select('+pushSubscriptions')
    const remaining = fresh.pushSubscriptions.filter(s => s.endpoint === 'https://fcm.example.test/sub/1')
    expect(remaining).to.have.lengthOf(0)
  })

  it('NotificationSchema.save triggers webpush.sendToUser without throwing', async function () {
    // Stub sendToUser so we don't actually hit a (fake) push service.
    const originalSend = webpush.sendToUser
    let captured
    webpush.sendToUser = async function (userId, payload) {
      captured = { userId: String(userId), payload }
      return { sent: 1, removed: 0 }
    }
    try {
      const notif = await NotificationSchema.create({
        owner: createdUser._id,
        title: 'Hooked',
        message: 'fan-out probe',
        type: 0,
        data: {}
      })
      // The hook runs synchronously after save, but the actual call is
      // fire-and-forget. Tick once so the catch chain doesn't unhandle.
      await new Promise(r => setImmediate(r))
      expect(captured, 'sendToUser was invoked').to.exist
      expect(captured.userId).to.equal(String(createdUser._id))
      expect(captured.payload.title).to.equal('Hooked')
      await NotificationSchema.deleteOne({ _id: notif._id })
    } finally {
      webpush.sendToUser = originalSend
    }
  })
})
