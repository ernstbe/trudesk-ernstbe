/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const { getDeadlineStatus } = require('../../src/helpers/deadlineHelper')

describe('deadlineHelper', function () {
  it('should return green with Infinity for null dueDate', function () {
    const result = getDeadlineStatus(null)
    expect(result.status).to.equal('green')
    expect(result.daysRemaining).to.equal(Infinity)
  })

  it('should return green with Infinity for undefined dueDate', function () {
    const result = getDeadlineStatus(undefined)
    expect(result.status).to.equal('green')
    expect(result.daysRemaining).to.equal(Infinity)
  })

  it('should return green for due date more than 7 days away', function () {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 15)
    const result = getDeadlineStatus(futureDate)
    expect(result.status).to.equal('green')
    expect(result.daysRemaining).to.be.above(7)
  })

  it('should return yellow for due date 1-7 days away', function () {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const result = getDeadlineStatus(futureDate)
    expect(result.status).to.equal('yellow')
    expect(result.daysRemaining).to.be.at.least(1)
    expect(result.daysRemaining).to.be.at.most(7)
  })

  it('should return red for due date today', function () {
    const today = new Date()
    const result = getDeadlineStatus(today)
    expect(result.status).to.equal('red')
    expect(result.daysRemaining).to.equal(0)
  })

  it('should return overdue for past due date', function () {
    const pastDate = new Date()
    pastDate.setDate(pastDate.getDate() - 3)
    const result = getDeadlineStatus(pastDate)
    expect(result.status).to.equal('overdue')
    expect(result.daysRemaining).to.be.below(0)
  })

  it('should return yellow for exactly 1 day away', function () {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const result = getDeadlineStatus(tomorrow)
    expect(result.status).to.equal('yellow')
    expect(result.daysRemaining).to.equal(1)
  })

  it('should return yellow for exactly 7 days away', function () {
    const sevenDays = new Date()
    sevenDays.setDate(sevenDays.getDate() + 7)
    const result = getDeadlineStatus(sevenDays)
    expect(result.status).to.equal('yellow')
    expect(result.daysRemaining).to.equal(7)
  })

  it('should return green for exactly 8 days away', function () {
    const eightDays = new Date()
    eightDays.setDate(eightDays.getDate() + 8)
    const result = getDeadlineStatus(eightDays)
    expect(result.status).to.equal('green')
    expect(result.daysRemaining).to.equal(8)
  })
})
