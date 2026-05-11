/* eslint-disable no-unused-expressions */
const { expect } = require('chai')

/**
 * Unit-tests the rate-limit middleware from PR #45.
 *
 * The middleware in production wraps rate-limiter-flexible; in tests
 * (NODE_ENV=test) it short-circuits to a pass-through so the rest of
 * the suite isn't affected by per-test state leaking. We toggle the
 * env var locally to verify the actual enforcement path works.
 */
describe('middleware/rateLimits', function () {
  let rateLimits
  let originalEnv

  before(function () {
    originalEnv = process.env.NODE_ENV
    // Re-require with a non-test env so the wrap actually runs the limiter.
    process.env.NODE_ENV = 'unit-test-enforce'
    delete require.cache[require.resolve('../../src/middleware/rateLimits')]
    rateLimits = require('../../src/middleware/rateLimits')
  })

  after(function () {
    process.env.NODE_ENV = originalEnv
    // Restore the cached pass-through version for the rest of the suite.
    delete require.cache[require.resolve('../../src/middleware/rateLimits')]
    require('../../src/middleware/rateLimits')
  })

  function fakeReq (ip = '10.99.0.1') {
    return { ip, headers: {} }
  }

  function fakeRes () {
    const headers = {}
    const res = {
      statusCode: null,
      body: null,
      set (k, v) { headers[k] = v },
      status (code) { res.statusCode = code; return res },
      json (b) { res.body = b; return res },
      _headers: headers
    }
    return res
  }

  function run (mw, req, res) {
    return new Promise((resolve) => {
      mw(req, res, function () { resolve('next') })
      // If 429, the middleware calls res.json without next. Poll briefly.
      const t = setInterval(() => {
        if (res.statusCode !== null) {
          clearInterval(t)
          resolve('blocked')
        }
      }, 10)
      // Safety timeout.
      setTimeout(() => { clearInterval(t); resolve('timeout') }, 1500)
    })
  }

  it('passes through requests below the threshold (apiLogin: 10/15min)', async function () {
    const req = fakeReq('10.99.0.10')
    // Five attempts should all pass.
    for (let i = 0; i < 5; i++) {
      const res = fakeRes()
      const outcome = await run(rateLimits.apiLogin, req, res)
      expect(outcome).to.equal('next', `attempt ${i + 1} should pass`)
    }
  })

  it('blocks with 429 after the threshold is exceeded', async function () {
    const req = fakeReq('10.99.0.11')
    // Burn 10 successful attempts.
    for (let i = 0; i < 10; i++) {
      const res = fakeRes()
      await run(rateLimits.apiLogin, req, res)
    }
    // 11th should be blocked.
    const res = fakeRes()
    const outcome = await run(rateLimits.apiLogin, req, res)
    expect(outcome).to.equal('blocked')
    expect(res.statusCode).to.equal(429)
    expect(res.body).to.have.property('success', false)
    expect(res._headers).to.have.property('Retry-After')
  })

  it('tracks separate IPs independently', async function () {
    // After IP .11 was blocked above, a fresh IP must still pass.
    const res = fakeRes()
    const outcome = await run(rateLimits.apiLogin, fakeReq('10.99.0.12'), res)
    expect(outcome).to.equal('next')
  })

  it('publicRegister limits more aggressively (5/hour)', async function () {
    const req = fakeReq('10.99.0.20')
    for (let i = 0; i < 5; i++) {
      const res = fakeRes()
      await run(rateLimits.publicRegister, req, res)
    }
    const res = fakeRes()
    const outcome = await run(rateLimits.publicRegister, req, res)
    expect(outcome).to.equal('blocked')
    expect(res.statusCode).to.equal(429)
  })

  it('honors X-Forwarded-For when USE_XFORWARDIP=true', async function () {
    const originalXFF = process.env.USE_XFORWARDIP
    process.env.USE_XFORWARDIP = 'true'

    try {
      // Same req.ip, different X-Forwarded-For — should be tracked separately.
      const ipA = '203.0.113.1'
      const ipB = '203.0.113.2'

      // Burn ipA up to its limit.
      for (let i = 0; i < 10; i++) {
        const req = { ip: '10.0.0.1', headers: { 'x-forwarded-for': ipA } }
        await run(rateLimits.apiLogin, req, fakeRes())
      }
      const blockedRes = fakeRes()
      await run(rateLimits.apiLogin, { ip: '10.0.0.1', headers: { 'x-forwarded-for': ipA } }, blockedRes)
      expect(blockedRes.statusCode, 'ipA blocked').to.equal(429)

      // ipB on the same req.ip is independent.
      const freshRes = fakeRes()
      const outcome = await run(rateLimits.apiLogin, { ip: '10.0.0.1', headers: { 'x-forwarded-for': ipB } }, freshRes)
      expect(outcome).to.equal('next')
    } finally {
      if (originalXFF === undefined) delete process.env.USE_XFORWARDIP
      else process.env.USE_XFORWARDIP = originalXFF
    }
  })
})
