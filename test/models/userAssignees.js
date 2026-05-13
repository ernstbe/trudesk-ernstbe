/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const userSchema = require('../../src/models/user')
const roleSchema = require('../../src/models/role')

// Regression for "only the calling Admin appears in getassignees" caused by
// stale `role.isAgent` virtuals on the lean docs in `global.roles`. The
// virtual reads `global.roles` to decide, but `getRolesLean()` runs at boot
// BEFORE `global.roles` is set, so the lean docs get isAgent=false frozen on
// them. The fix in user.js reads `role.grants` directly. This test
// reproduces the boot order using lean docs and asserts that all
// agent-grant-bearing roles are picked up regardless of the stale virtual.
describe('user.getAssigneeUsers regression', function () {
  let savedGlobalRoles
  let createdAgent

  before(async function () {
    savedGlobalRoles = global.roles

    // Self-contained fixture: the test/api/users.js suite mutates the shared
    // seed user (fake.user → User role), so create our own Support-role user
    // here to avoid order-dependence.
    const supportRole = (await roleSchema.getRoles()).find(r => r.normalized === 'support')
    expect(supportRole, 'support role exists').to.exist
    createdAgent = await userSchema.create({
      username: 'regression.agent',
      password: '$2a$04$350Dkwcq9EpJLFhbeLB0buFcyFkI9q3edQEPpy/zqLjROMD9LPToW',
      fullname: 'Regression Agent',
      email: 'regression.agent@trudesk.io',
      role: supportRole._id,
      accessToken: 'regression-agent-token'
    })
  })

  after(async function () {
    global.roles = savedGlobalRoles
    if (createdAgent) await userSchema.deleteOne({ _id: createdAgent._id })
  })

  it('returns users for every role with agent:* grant, even when role.isAgent is stale-false', async function () {
    // Simulate the boot path: clear global.roles, then load via getRolesLean()
    // so mongoose-lean-virtuals eagerly evaluates `isAgent` while global.roles
    // is still undefined. Every lean doc ends up with isAgent=false.
    global.roles = undefined
    const leanRoles = await roleSchema.getRolesLean()
    global.roles = leanRoles

    // Sanity: the stale-virtual condition we're guarding against.
    const supportLean = leanRoles.find(r => r.normalized === 'support')
    expect(supportLean, 'support role exists').to.exist
    expect(supportLean.grants).to.include('agent:*')
    // (If the upstream plugin ever switches to lazy virtuals this assertion
    // may break — that's fine, the bug it documents no longer applies.)
    expect(supportLean.isAgent).to.equal(false)

    const assignees = await userSchema.getAssigneeUsers()
    const fullnames = assignees.map(u => u.fullname)

    // The Support-role user we created in before() must come back even
    // though its role's stale virtual says isAgent=false.
    expect(fullnames).to.include('Regression Agent')
  })
})
