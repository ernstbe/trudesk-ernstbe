/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

// Smoke that the v2 mounts of the v1 public-signup endpoints are
// reachable. We don't try to drive the captcha flow end-to-end here
// (the existing v1 tests for these endpoints are commented out for
// the same reason — captcha lives in `req.session.captcha` which is
// a pain to seed from a raw HTTP test). Instead, confirm the route
// is registered and the captcha middleware runs, which gets us a
// 400 "Invalid Captcha" — that's strictly different from a 404
// "not found", so it proves the mount.
describe('v2 public-signup mounts', function () {
  const baseUrl = 'http://localhost:3111'
  const agent = superagent.agent()

  async function expectInvalidCaptcha (path, body) {
    try {
      await agent.post(baseUrl + path).send(body)
      throw new Error('expected request to be rejected')
    } catch (err) {
      expect(err.response, 'request reached the server').to.exist
      // 400 = captcha rejected (route mounted)
      // 429 = rate-limited from previous test runs (also proves route mounted)
      expect([400, 429]).to.include(err.response.status)
    }
  }

  it('POST /api/v2/public/users/checkemail is mounted', async function () {
    await expectInvalidCaptcha('/api/v2/public/users/checkemail', { email: 'x@x.com', captcha: 'wrong' })
  })

  it('POST /api/v2/public/account/create is mounted', async function () {
    await expectInvalidCaptcha('/api/v2/public/account/create', {
      username: 'newuser', email: 'x@x.com', fullname: 'X', password: 'pw', captcha: 'wrong'
    })
  })

  it('POST /api/v2/public/tickets/create is mounted', async function () {
    await expectInvalidCaptcha('/api/v2/public/tickets/create', { captcha: 'wrong' })
  })
})
