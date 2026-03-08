/* eslint-disable no-unused-expressions */
const expect = require('chai').expect

const permissions = require('../../src/permissions')

describe('premissions.js', function () {
  it('should return false', function (done) {
    const result = permissions.canThis(undefined, 'action:action')
    const result2 = permissions.canThis('fakerole', 'action:action')
    expect(result).to.be.false
    expect(result2).to.be.false

    done()
  })

  it('should allow comment creation', function (done) {
    const result = permissions.canThis(global.supportRoleId, 'comments:create')

    expect(result).to.be.true

    done()
  })

  it('show allow note creation', function (done) {
    const result = permissions.canThis(global.supportRoleId, 'tickets:notes')

    expect(result).to.be.true

    done()
  })

  it('should get roles with action', function (done) {
    const results = permissions.getRoles('tickets:create')

    expect(results).to.have.length(3)

    done()
  })
})
