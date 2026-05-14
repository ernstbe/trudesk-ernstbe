/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const userSchema = require('../../src/models/user')
const roleSchema = require('../../src/models/role')

// Sliding-expiry for per-device access tokens. The auth path
// (`getUserByAccessToken`) lazily rejects + removes any array entry whose
// `lastUsedAt` falls outside the configured idle window; the static
// `purgeExpiredAccessTokens` is the weekly cron's batch counterpart.
describe('user.accessTokens sliding-expiry', function () {
  const TTL = userSchema.ACCESS_TOKEN_IDLE_TTL_MS
  let createdUser

  before(async function () {
    expect(TTL, 'TTL constant exported').to.be.a('number').and.greaterThan(0)
    const supportRole = (await roleSchema.getRoles()).find(r => r.normalized === 'support')
    expect(supportRole).to.exist
    createdUser = await userSchema.create({
      username: 'expiry.test',
      password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
      fullname: 'Expiry Test',
      email: 'expiry.test@trudesk.io',
      role: supportRole._id
    })
  })

  after(async function () {
    if (createdUser) await userSchema.deleteOne({ _id: createdUser._id })
  })

  async function setTokenLastUsed (token, lastUsedAt) {
    await userSchema.collection.updateOne(
      { _id: createdUser._id, 'accessTokens.token': token },
      { $set: { 'accessTokens.$.lastUsedAt': lastUsedAt } }
    )
  }

  it('getUserByAccessToken returns null and removes the entry when idle past the TTL', async function () {
    const token = await createdUser.addAccessToken('device-stale', 'IntegrationTest/1.0')
    const wayOutside = new Date(Date.now() - TTL - 5 * 60 * 1000)
    await setTokenLastUsed(token, wayOutside)

    const found = await userSchema.getUserByAccessToken(token)
    expect(found, 'expired token must not authenticate').to.be.null

    const fresh = await userSchema.findById(createdUser._id).select('+accessTokens')
    const stillThere = (fresh.accessTokens || []).some(t => t.token === token)
    expect(stillThere, 'expired entry must be removed from the array').to.be.false
  })

  it('getUserByAccessToken still works for a recently-used token and refreshes lastUsedAt', async function () {
    const token = await createdUser.addAccessToken('device-active', 'IntegrationTest/1.0')
    // Backdate to ~5 minutes ago — well inside TTL, but past the 60s debounce
    // so the opportunistic refresh path runs.
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000)
    await setTokenLastUsed(token, fiveMinAgo)

    const found = await userSchema.getUserByAccessToken(token)
    expect(found, 'active token must authenticate').to.exist
    expect(found.username).to.equal('expiry.test')

    // The refresh is fire-and-forget; give it a microtask tick then re-read.
    await new Promise(resolve => setTimeout(resolve, 50))
    const fresh = await userSchema.findById(createdUser._id).select('+accessTokens')
    const entry = fresh.accessTokens.find(t => t.token === token)
    expect(entry, 'active entry survives').to.exist
    expect(new Date(entry.lastUsedAt).getTime(), 'lastUsedAt was refreshed')
      .to.be.greaterThan(fiveMinAgo.getTime())
  })

  it('purgeExpiredAccessTokens drops idle entries and keeps fresh ones', async function () {
    // Reset to a clean slot — clear any tokens left over from earlier tests
    // so the assertion is unambiguous.
    await userSchema.updateOne({ _id: createdUser._id }, { $set: { accessTokens: [] } })

    const refreshed = await userSchema.findById(createdUser._id).select('+accessTokens')
    const dead1 = await refreshed.addAccessToken('device-purge-1', 'X')
    const dead2 = await refreshed.addAccessToken('device-purge-2', 'X')
    const alive = await refreshed.addAccessToken('device-purge-active', 'X')

    const stale = new Date(Date.now() - TTL - 60 * 1000)
    await setTokenLastUsed(dead1, stale)
    await setTokenLastUsed(dead2, stale)
    // `alive` keeps its fresh lastUsedAt from addAccessToken.

    const result = await userSchema.purgeExpiredAccessTokens()
    expect(result.tokensRemoved, 'two stale entries removed').to.be.at.least(2)
    expect(result.usersTouched, 'at least our user was touched').to.be.at.least(1)

    const fresh = await userSchema.findById(createdUser._id).select('+accessTokens')
    const tokens = (fresh.accessTokens || []).map(t => t.token)
    expect(tokens, 'fresh entry survived purge').to.include(alive)
    expect(tokens, 'stale entries gone').to.not.include(dead1)
    expect(tokens, 'stale entries gone').to.not.include(dead2)
  })
})
