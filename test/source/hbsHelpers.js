const expect = require('chai').expect

const hbsHelpers = require('../../src/helpers/hbs/helpers')

describe('Handlebars Helpers', function () {
  it('should return status name', function (done) {
    const strNew = hbsHelpers.helpers.statusName(0)
    const strOpen = hbsHelpers.helpers.statusName(1)
    const strPending = hbsHelpers.helpers.statusName(2)
    const strClosed = hbsHelpers.helpers.statusName(3)
    const strDefault = hbsHelpers.helpers.statusName()

    expect(strNew).to.equal('New')
    expect(strOpen).to.equal('Open')
    expect(strPending).to.equal('Pending')
    expect(strClosed).to.equal('Closed')
    expect(strDefault).to.equal('New')

    done()
  })
})
