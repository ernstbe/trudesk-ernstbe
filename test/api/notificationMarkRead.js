/* eslint-disable no-unused-expressions */
/* globals server */
const request = require('supertest')
const { expect } = require('chai')

/**
 * Tests for POST /api/v1/users/notifications/:id/markRead and
 * POST /api/v1/users/notifications/markAllRead.
 *
 * Both endpoints were added because the PWA's "click notification to
 * mark read" only updated in-memory state — refreshing would re-show
 * everything as unread. The fix is on the server: actually persist
 * unread=false to MongoDB.
 */
describe('api/v1/users/notifications mark-read', function () {
  const notificationSchema = require('../../src/models/notification')
  const userSchema = require('../../src/models/user')

  async function createNotificationFor (username) {
    const user = await userSchema.findOne({ username }).select('+accessToken')
    const note = await notificationSchema.create({
      owner: user._id,
      title: 'Test',
      message: 'hello',
      type: 0,
      unread: true
    })
    return { user, note }
  }

  it('marks a single notification as read', async function () {
    const { user, note } = await createNotificationFor('trudesk')

    await request(server)
      .post(`/api/v1/users/notifications/${note._id}/markRead`)
      .set('accesstoken', user.accessToken)
      .expect(200)

    const after = await notificationSchema.findById(note._id)
    expect(after.unread, 'persisted unread=false').to.be.false
  })

  it('returns 403 when marking someone else\'s notification', async function () {
    const { note } = await createNotificationFor('fake.user')
    const attacker = await userSchema.findOne({ username: 'trudesk' }).select('+accessToken')

    await request(server)
      .post(`/api/v1/users/notifications/${note._id}/markRead`)
      .set('accesstoken', attacker.accessToken)
      .expect(403)

    // And the notification stays unread.
    const after = await notificationSchema.findById(note._id)
    expect(after.unread, 'still unread').to.be.true
  })

  it('returns 404 for a non-existent notification', async function () {
    const user = await userSchema.findOne({ username: 'trudesk' }).select('+accessToken')

    await request(server)
      .post('/api/v1/users/notifications/507f1f77bcf86cd799439011/markRead')
      .set('accesstoken', user.accessToken)
      .expect(404)
  })

  it('marks every unread notification for the user as read', async function () {
    const user = await userSchema.findOne({ username: 'trudesk' }).select('+accessToken')

    // Wipe any prior test state for a clean count.
    await notificationSchema.deleteMany({ owner: user._id })
    await notificationSchema.create([
      { owner: user._id, title: 'a', message: 'a', type: 0, unread: true },
      { owner: user._id, title: 'b', message: 'b', type: 0, unread: true },
      { owner: user._id, title: 'c', message: 'c', type: 0, unread: false } // already read
    ])

    const res = await request(server)
      .post('/api/v1/users/notifications/markAllRead')
      .set('accesstoken', user.accessToken)
      .expect(200)

    expect(res.body).to.have.property('success', true)
    expect(res.body.updated, 'updated count').to.equal(2)

    const stillUnread = await notificationSchema.countDocuments({ owner: user._id, unread: true })
    expect(stillUnread).to.equal(0)
  })

  it('does not touch other users\' notifications on markAllRead', async function () {
    const trudesk = await userSchema.findOne({ username: 'trudesk' }).select('+accessToken')
    const fake = await userSchema.findOne({ username: 'fake.user' })

    await notificationSchema.deleteMany({ owner: fake._id })
    await notificationSchema.create({ owner: fake._id, title: 'x', message: 'x', type: 0, unread: true })

    await request(server)
      .post('/api/v1/users/notifications/markAllRead')
      .set('accesstoken', trudesk.accessToken)
      .expect(200)

    const fakeStillUnread = await notificationSchema.countDocuments({ owner: fake._id, unread: true })
    expect(fakeStillUnread).to.equal(1)
  })
})
