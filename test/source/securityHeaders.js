/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const superagent = require('superagent')

// Sanity check that the headers added in `allowCrossDomain` actually make
// it onto a response. Regression guard for accidental removal — the values
// themselves are easy to read in the middleware; we only assert presence
// plus the load-bearing directives the audit cares about.
describe('security headers', function () {
  let res

  before(function (done) {
    superagent.agent().get('http://localhost:3111/').end(function (err, r) {
      if (err && !r) return done(err)
      res = r
      done()
    })
  })

  it('Content-Security-Policy includes frame-ancestors none', function () {
    const csp = res.headers['content-security-policy']
    expect(csp, 'CSP header set').to.be.a('string')
    expect(csp).to.match(/frame-ancestors 'none'/)
  })

  it('Content-Security-Policy locks default-src to self', function () {
    expect(res.headers['content-security-policy']).to.match(/default-src 'self'/)
  })

  it('Cross-Origin-Opener-Policy is same-origin', function () {
    expect(res.headers['cross-origin-opener-policy']).to.equal('same-origin')
  })

  it('Cross-Origin-Resource-Policy is same-origin', function () {
    expect(res.headers['cross-origin-resource-policy']).to.equal('same-origin')
  })

  it('X-Frame-Options is DENY', function () {
    expect(res.headers['x-frame-options']).to.equal('DENY')
  })
})
