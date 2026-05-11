/*
 * Rate-limit middleware for credential-bearing public endpoints.
 *
 * The page POST /login already has an IP-based brute-force limiter in
 * controllers/main.js. The API surfaces below were unprotected — anyone
 * could hammer /api/v1/login (PWA + mobile auth) at full speed. This
 * module supplies reusable limiters and a thin Express wrapper.
 *
 * Limits are intentionally generous for a single legitimate user (forgot
 * password → a few retries) but cut off automated dictionary attacks.
 *
 * Skipped when NODE_ENV === 'test' so the existing Mocha suite keeps
 * passing without per-test state leaking between cases.
 */

const RateLimiterMemory = require('rate-limiter-flexible').RateLimiterMemory

const apiLoginLimiter = new RateLimiterMemory({
  keyPrefix: 'api_login_per_ip',
  points: 10, // 10 attempts...
  duration: 60 * 15, // ...per 15 minutes
  blockDuration: 60 * 15 // hold the block for the same window after hitting the cap
})

const publicRegisterLimiter = new RateLimiterMemory({
  keyPrefix: 'public_register_per_ip',
  points: 5, // signing up + email-check shouldn't burst
  duration: 60 * 60, // ...per hour
  blockDuration: 60 * 60
})

function clientIp (req) {
  if (process.env.USE_XFORWARDIP === 'true') {
    const xff = req.headers['x-forwarded-for']
    if (xff) return xff.split(',')[0].trim()
  }
  return req.ip
}

function wrap (limiter) {
  return function (req, res, next) {
    if (process.env.NODE_ENV === 'test') return next()

    const ip = clientIp(req)
    limiter.consume(ip).then(
      () => next(),
      (rlRejected) => {
        if (rlRejected instanceof Error) return next(rlRejected)
        const secs = Math.round(rlRejected.msBeforeNext / 1000) || 1
        res.set('Retry-After', String(secs))
        return res.status(429).json({
          success: false,
          error: `Too many requests. Retry after ${secs} seconds.`
        })
      }
    )
  }
}

module.exports = {
  apiLogin: wrap(apiLoginLimiter),
  publicRegister: wrap(publicRegisterLimiter)
}
