/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const m = require('mongoose')
const ticketSchema = require('../../src/models/ticket')
const groupSchema = require('../../src/models/group')
const prioritySchema = require('../../src/models/ticketpriority')
const statusSchema = require('../../src/models/ticketStatus')

describe('ticket.js', function () {
  let testTicketUid
  // it('should clear collections.', function(done) {
  //    expect(mongoose).to.exist;
  //
  //    dbHelper.clearCollections(mongoose, function(err) {
  //        expect(err).to.not.exist;
  //
  //        done();
  //    });
  // });

  it('should create ticket', async function () {
    const p = await prioritySchema.findOne({ default: true }).exec()
    expect(p).to.be.a('object')
    const status = await statusSchema.findOne({ uid: 0 }).exec()
    expect(status).to.be.a('object')
    const t = await ticketSchema.create({
      owner: new m.Types.ObjectId(),
      group: new m.Types.ObjectId(),
      status: status._id,
      tags: [],
      date: new Date(),
      subject: 'Dummy Test Subject',
      issue: 'Dummy Test Issue',
      priority: p._id,
      type: new m.Types.ObjectId(),
      history: []
    })
    expect(t).to.be.a('object')
    expect(t._doc).to.include.keys(
      '_id',
      'uid',
      'owner',
      'group',
      'status',
      'tags',
      'date',
      'subject',
      'issue',
      'priority',
      'type',
      'history',
      'attachments',
      'comments',
      'deleted'
    )

    expect(t.uid).to.be.a('number')
    testTicketUid = t.uid
  })

  it('should set the ticket status to closed then to open', async function () {
    // Close the ticket
    const closedStatus = await statusSchema.findOne({ uid: 3 })
    expect(closedStatus).to.be.a('object')

    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const closedTicket = await ticket.setStatus(ticket._id, closedStatus._id)
    expect(closedTicket.status).to.equal(closedStatus._id)
    expect(closedTicket.closedDate).to.exist

    // Open the ticket
    const openStatus = await statusSchema.findOne({ uid: 1 })
    expect(openStatus).to.be.a('object')

    const ticket2 = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket2).to.be.a('object')

    const openedTicket = await ticket2.setStatus(ticket2._id, openStatus._id)
    expect(openedTicket.status).to.equal(openStatus._id)
    console.log(openedTicket)
    expect(openedTicket.closedDate).to.not.exist
  })

  it('should set assignee to user', async function () {
    const userSchema = require('../../src/models/user')
    const user = await userSchema.getUserByUsername('trudesk')
    expect(user).to.be.a('object')
    expect(user).to.have.property('_id')

    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const updatedTicket = await ticket.setAssignee(user._id, user._id)
    expect(updatedTicket.assignee).to.equal(user._id)
  })

  it('should set ticket type', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const typeSchema = require('../../src/models/tickettype')
    const type = await typeSchema.getTypeByName('Issue')
    expect(type).to.be.a('object')
    const ownerId = new m.Types.ObjectId()

    const updatedTicket = await ticket.setTicketType(ownerId, type._id)
    expect(updatedTicket.type._id).to.equal(type._id)
  })

  it('should set ticket priority', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')
    const ownerId = new m.Types.ObjectId()
    const priority = await prioritySchema.getByMigrationNum(3)
    expect(priority).to.be.a('object')

    const updatedTicket = await ticket.setTicketPriority(ownerId, priority)
    expect(updatedTicket.priority.name).to.equal('Critical')
  })

  it('should set ticket group', async function () {
    const grp = groupSchema({
      name: 'Test'
    })
    const group = await grp.save()
    expect(group).to.be.a('object')

    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')
    const ownerId = new m.Types.ObjectId()
    const updatedTicket = await ticket.setTicketGroup(ownerId, group._id)
    expect(updatedTicket.group.name).to.equal('Test')
  })

  it('should clear the ticket assignee', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const updatedTicket = await ticket.clearAssignee(new m.Types.ObjectId())
    expect(updatedTicket.assignee).to.not.exist
  })

  it('should add Comment and Save', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const comment = {
      owner: new m.Types.ObjectId(),
      date: new Date(),
      comment: 'This is a comment'
    }

    ticket.comments.push(comment)

    // Fake populate required Fields
    ticket.group = new m.Types.ObjectId()
    ticket.owner = new m.Types.ObjectId()
    ticket.type = new m.Types.ObjectId()

    const savedTicket = await ticket.save()
    expect(savedTicket.comments).to.have.length(1)
  })

  it('should update comment', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const commentId = ticket.comments[0]._id
    expect(commentId).to.exist

    const updatedTicket = await ticket.updateComment(new m.Types.ObjectId(), commentId, 'This is the new comment text')
    expect(updatedTicket.comments[0].comment).to.equal('This is the new comment text')
  })

  it('should remove comment', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const commentId = ticket.comments[0]._id
    expect(commentId).to.exist

    const updatedTicket = await ticket.removeComment(new m.Types.ObjectId(), commentId)
    expect(updatedTicket.comments).to.have.length(0)
  })

  it('should add Note and Save', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const note = {
      owner: new m.Types.ObjectId(),
      date: new Date(),
      note: 'This is a note'
    }

    ticket.notes.push(note)

    // Fake populate required Fields
    ticket.group = new m.Types.ObjectId()
    ticket.owner = new m.Types.ObjectId()
    ticket.type = new m.Types.ObjectId()

    const savedTicket = await ticket.save()
    expect(savedTicket.notes).to.have.length(1)
  })

  it('should update note', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const noteId = ticket.notes[0]._id
    expect(noteId).to.exist

    const updatedTicket = await ticket.updateNote(new m.Types.ObjectId(), noteId, 'This is the new note text')
    expect(updatedTicket.notes[0].note).to.equal('This is the new note text')
  })

  it('should remove note', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const noteId = ticket.notes[0]._id
    expect(noteId).to.exist

    const updatedTicket = await ticket.removeNote(new m.Types.ObjectId(), noteId)
    expect(updatedTicket.notes).to.have.length(0)
  })

  it('should set ticket issue', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const ownerId = new m.Types.ObjectId()
    const updatedTicket = await ticket.setIssue(ownerId, 'This is the new issue text')
    expect(updatedTicket.issue).to.equal('<p>This is the new issue text</p>\n')
  })

  it('should get all tickets', async function () {
    const tickets = await ticketSchema.getForCache()
    expect(tickets.length).to.be.at.least(1)
  })

  it('should get all tickets for group', async function () {
    const tickets = await ticketSchema.getTickets([new m.Types.ObjectId()])
    expect(tickets).to.have.length(0)
  })

  it('should error getting tickets for group', async function () {
    try {
      await ticketSchema.getTickets(undefined)
      throw new Error('Should have thrown')
    } catch (err) {
      expect(err).to.exist
    }

    try {
      await ticketSchema.getTickets(1)
      throw new Error('Should have thrown')
    } catch (err) {
      expect(err).to.exist
    }
  })

  it('should get all tickets for group with limit', function (done) {
    // todo Rewrite this with GetTicketsWithObject Test
    return done()
  })

  it('should get all tickets for group by status', async function () {
    const tickets = await ticketSchema.getTicketsByStatus([new m.Types.ObjectId()], new m.Types.ObjectId())
    expect(tickets).to.have.length(0)

    try {
      await ticketSchema.getTicketsByStatus(undefined, new m.Types.ObjectId())
      throw new Error('Should have thrown')
    } catch (err) {
      expect(err).to.exist
    }

    try {
      await ticketSchema.getTicketsByStatus(new m.Types.ObjectId(), new m.Types.ObjectId())
      throw new Error('Should have thrown')
    } catch (err) {
      expect(err).to.exist
    }
  })

  it('should get all tickets by status', async function () {
    const status = await statusSchema.findOne({ uid: 0 })
    const tickets = await ticketSchema.getAllByStatus(status._id)
    expect(tickets.length).to.be.at.least(1)
  })

  it('should get ticket by _id', async function () {
    // eslint-disable-next-line no-unused-vars
    const _ticket = await ticketSchema.getTicketById(new m.Types.ObjectId())
    // ticket may be null for a random ObjectId, that's fine

    try {
      await ticketSchema.getTicketById(undefined)
      throw new Error('Should have thrown')
    } catch (err) {
      expect(err).to.exist
    }
  })

  it('should get tickets by assignee', async function () {
    // eslint-disable-next-line no-unused-vars
    const _tickets = await ticketSchema.getAssigned(new m.Types.ObjectId())
    // may be empty array, that's fine

    try {
      await ticketSchema.getAssigned(undefined)
      throw new Error('Should have thrown')
    } catch (err) {
      expect(err).to.exist
    }
  })

  // Should be last
  it('should soft delete ticket', async function () {
    const ticket = await ticketSchema.getTicketByUid(testTicketUid)
    expect(ticket).to.be.a('object')

    const deletedTicket = await ticketSchema.softDelete(ticket._id)
    expect(deletedTicket).to.be.a('object')
    expect(deletedTicket.deleted).to.be.true
  })
})
