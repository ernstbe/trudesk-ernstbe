/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const ticketTypeSchema = require('../../src/models/tickettype')

describe('ticketType.js', function () {
  it('should create a ticket type', async function () {
    const tt = await ticketTypeSchema.create({
      name: 'Test Ticket Type'
    })
    expect(tt).to.be.a('object')
    expect(tt._doc).to.include.keys('_id', 'name')
  })

  it('should get all ticket types.', async function () {
    const types = await ticketTypeSchema.getTypes()
    expect(types).to.be.a('array')
    expect(types).to.have.length(3) // Has default ticket types already
  })

  it('should get ticket type via name', async function () {
    const type = await ticketTypeSchema.getTypeByName('Test Ticket Type')
    expect(type).to.be.a('object')
  })
})
