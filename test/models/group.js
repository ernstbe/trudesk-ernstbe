/* eslint-disable no-unused-expressions */
var expect = require('chai').expect
var m = require('mongoose')
var groupSchema = require('../../src/models/group')

describe('group.js', function () {
  var groupId = new m.Types.ObjectId()
  var memberId1 = new m.Types.ObjectId()
  var memberId2 = new m.Types.ObjectId()
  var memberId3 = new m.Types.ObjectId()

  var nonMember1 = new m.Types.ObjectId()

  it('should create a group', async function () {
    var group = await groupSchema.create({
      _id: groupId,
      name: 'Test Group',
      members: [memberId1, memberId2, memberId3],
      sendMailTo: []
    })
    expect(group).to.be.a('object')
    expect(group._doc).to.include.keys('_id', 'name', 'members', 'sendMailTo')
  })

  it('should get all groups', async function () {
    var group = await groupSchema.getAllGroups()
    expect(group).to.have.length(2)
  })

  it('should get group by id', async function () {
    var groups = await groupSchema.getGroupById(groupId)
    expect(groups).to.be.a('object')
  })

  it('should add group member', async function () {
    var group = await groupSchema.getGroupByName('Test Group')
    expect(group).to.be.a('object')

    var success = await group.addMember(nonMember1)
    expect(success).to.equal(true)

    var success2 = await group.addMember(memberId1)
    expect(success2).to.equal(true)
  })

  it('should remove group member', async function () {
    var group = await groupSchema.getGroupByName('Test Group')
    expect(group).to.be.a('object')
    var mem = {
      _id: memberId2
    }
    group.members = [mem]
    var success = await group.removeMember(memberId2)
    expect(success).to.equal(true)
  })
})
