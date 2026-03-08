/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const m = require('mongoose')
const groupSchema = require('../../src/models/group')

describe('group.js', function () {
  const groupId = new m.Types.ObjectId()
  const memberId1 = new m.Types.ObjectId()
  const memberId2 = new m.Types.ObjectId()
  const memberId3 = new m.Types.ObjectId()

  const nonMember1 = new m.Types.ObjectId()

  it('should create a group', async function () {
    const group = await groupSchema.create({
      _id: groupId,
      name: 'Test Group',
      members: [memberId1, memberId2, memberId3],
      sendMailTo: []
    })
    expect(group).to.be.a('object')
    expect(group._doc).to.include.keys('_id', 'name', 'members', 'sendMailTo')
  })

  it('should get all groups', async function () {
    const group = await groupSchema.getAllGroups()
    expect(group).to.have.length(2)
  })

  it('should get group by id', async function () {
    const groups = await groupSchema.getGroupById(groupId)
    expect(groups).to.be.a('object')
  })

  it('should add group member', async function () {
    const group = await groupSchema.getGroupByName('Test Group')
    expect(group).to.be.a('object')

    const success = await group.addMember(nonMember1)
    expect(success).to.equal(true)

    const success2 = await group.addMember(memberId1)
    expect(success2).to.equal(true)
  })

  it('should remove group member', async function () {
    const group = await groupSchema.getGroupByName('Test Group')
    expect(group).to.be.a('object')
    const mem = {
      _id: memberId2
    }
    group.members = [mem]
    const success = await group.removeMember(memberId2)
    expect(success).to.equal(true)
  })
})
