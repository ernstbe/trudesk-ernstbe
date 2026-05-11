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
 * Storage: persisted in MongoDB (rate-limiter-flexible's RateLimiterMongo)
 * so the counter survives container restarts — Watchtower deploys a fresh
 * Trudesk container every few days, and an in-memory limiter would reset
 * the brute-force budget on every redeploy. A RateLimiterMemory is wired
 * up as insuranceLimiter so that a brief Mongo outage doesn't fail-open
 * completely.
 *
 * Skipped when NODE_ENV === 'test' so the existing Mocha suite keeps
 * passing without per-test state leaking between cases. The
 * 'unit-test-enforce' path in rateLimits.test.js exercises the real
 * limiter; because Mongoose isn't connected in unit tests, the lazy
 * lookup falls back to the in-process memory limiter — which is exactly
 * what those tests assert against.
 */

const mongoose = require('mongoose')
const { RateLimiterMemory, RateLimiterMongo } = require('rate-limiter-flexible')

const limiterConfigs = {
  apiLogin: {
    keyPrefix: 'api_login_per_ip',
    points: 10, // 10 attempts...
    duration: 60 * 15, // ...per 15 minutes
    blockDuration: 60 * 15 // hold the block for the same window after hitting the cap
  },
  publicRegister: {
    keyPrefix: 'public_register_per_ip',
    points: 5, // signing up + email-check shouldn't burst
    duration: 60 * 60, // ...per hour
    blockDuration: 60 * 60
  }
}

// Cached limiters per name. Memory limiters are created on first use before
// Mongoose has connected; once connected, we promote to a Mongo-backed
// limiter so subsequent requests get persisted across restarts. Counts in
// the brief memory phase are lost on promotion — acceptable for a one-time
// boot event.
const cache = {}

function isMongoReady () {
  return mongoose.connection && mongoose.connection.readyState === 1
}

function buildMongoLimiter (cfg) {
  return new RateLimiterMongo({
    storeClient: mongoose.connection,
    tableName: 'ratelimits',
    insuranceLimiter: new RateLimiterMemory(cfg),
    ...cfg
  })
}

function getLimiter (name) {
  const cfg = limiterConfigs[name]
  const cached = cache[name]
  // Already promoted to Mongo — keep using it.
  if (cached && cached.kind === 'mongo') return cached.limiter
  // Mongo ready now — build the persistent limiter and cache.
  if (isMongoReady()) {
    const limiter = buildMongoLimiter(cfg)
    cache[name] = { limiter, kind: 'mongo' }
    return limiter
  }
  // Mongo not ready yet — keep using the in-memory limiter we already built.
  if (cached) return cached.limiter
  const limiter = new RateLimiterMemory(cfg)
  cache[name] = { limiter, kind: 'memory' }
  return limiter
}

function clientIp (req) {
  if (process.env.USE_XFORWARDIP === 'true') {
    const xff = req.headers['x-forwarded-for']
    if (xff) return xff.split(',')[0].trim()
  }
  return req.ip
}

function wrap (name) {
  return function (req, res, next) {
    if (process.env.NODE_ENV === 'test') return next()

    const limiter = getLimiter(name)
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
  apiLogin: wrap('apiLogin'),
  publicRegister: wrap('publicRegister')
}
