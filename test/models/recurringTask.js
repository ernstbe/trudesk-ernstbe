/* eslint-disable no-unused-expressions */
const expect = require('chai').expect
const m = require('mongoose')
const recurringTaskSchema = require('../../src/models/recurringTask')

describe('recurringTask.js', function () {
  let testTaskId

  it('should create a monthly recurring task', async function () {
    const task = await recurringTaskSchema.create({
      name: 'Monatliche Sicherheitspruefung',
      description: 'Sicherheitsbegehung der Liegenschaft',
      ticketSubject: 'Sicherheitspruefung faellig',
      ticketIssue: 'Bitte Sicherheitsbegehung durchfuehren',
      ticketType: new m.Types.ObjectId(),
      ticketGroup: new m.Types.ObjectId(),
      ticketPriority: new m.Types.ObjectId(),
      scheduleType: 'monthly',
      dayOfMonth: 1,
      daysBeforeDeadline: 7,
      createdBy: new m.Types.ObjectId()
    })

    expect(task).to.be.a('object')
    expect(task.name).to.equal('Monatliche Sicherheitspruefung')
    expect(task.scheduleType).to.equal('monthly')
    expect(task.enabled).to.be.true
    expect(task.nextRun).to.exist
    testTaskId = task._id
  })

  it('should create a quarterly recurring task', async function () {
    const task = await recurringTaskSchema.create({
      name: 'Quartalsbericht',
      ticketSubject: 'Quartalsbericht erstellen',
      ticketIssue: 'Bitte Quartalsbericht anfertigen',
      ticketType: new m.Types.ObjectId(),
      ticketGroup: new m.Types.ObjectId(),
      ticketPriority: new m.Types.ObjectId(),
      scheduleType: 'quarterly',
      daysBeforeDeadline: 14,
      createdBy: new m.Types.ObjectId()
    })

    expect(task).to.be.a('object')
    expect(task.scheduleType).to.equal('quarterly')
    expect(task.nextRun).to.exist
  })

  it('should create an annual recurring task', async function () {
    const task = await recurringTaskSchema.create({
      name: 'Jahrespruefung UVV',
      ticketSubject: 'UVV Pruefung faellig',
      ticketIssue: 'Jaehrliche UVV-Pruefung durchfuehren',
      ticketType: new m.Types.ObjectId(),
      ticketGroup: new m.Types.ObjectId(),
      ticketPriority: new m.Types.ObjectId(),
      scheduleType: 'annual',
      monthsOfYear: [0, 6],
      daysBeforeDeadline: 30,
      createdBy: new m.Types.ObjectId()
    })

    expect(task).to.be.a('object')
    expect(task.scheduleType).to.equal('annual')
    expect(task.monthsOfYear).to.have.length(2)
  })

  it('should get all recurring tasks', async function () {
    const tasks = await recurringTaskSchema.getAll()
    expect(tasks).to.be.a('array')
    expect(tasks).to.have.length(3)
  })

  it('should get task by id', async function () {
    const task = await recurringTaskSchema.getById(testTaskId)
    expect(task).to.be.a('object')
    expect(task.name).to.equal('Monatliche Sicherheitspruefung')
  })

  it('should get only enabled tasks', async function () {
    const tasks = await recurringTaskSchema.getEnabled()
    expect(tasks).to.be.a('array')
    expect(tasks).to.have.length(3)
  })

  it('should disable a task and exclude it from enabled list', async function () {
    const task = await recurringTaskSchema.findById(testTaskId)
    task.enabled = false
    await task.save()

    const enabledTasks = await recurringTaskSchema.getEnabled()
    expect(enabledTasks).to.have.length(2)
  })

  it('should calculate next run correctly', function () {
    const task = {
      scheduleType: 'monthly',
      dayOfMonth: 15,
      daysBeforeDeadline: 7
    }

    const nextRun = recurringTaskSchema.calculateNextRun(task)
    expect(nextRun).to.be.a('date')
    expect(nextRun).to.be.above(new Date())
  })

  it('should calculate next run for quarterly', function () {
    const task = {
      scheduleType: 'quarterly',
      dayOfMonth: 1,
      daysBeforeDeadline: 14
    }

    const nextRun = recurringTaskSchema.calculateNextRun(task)
    expect(nextRun).to.be.a('date')
    expect(nextRun).to.be.above(new Date())
  })

  it('should update updatedAt on save', async function () {
    const task = await recurringTaskSchema.findById(testTaskId)
    const oldUpdated = task.updatedAt
    task.name = 'Updated Name'
    const saved = await task.save()
    expect(saved.updatedAt).to.exist
    if (oldUpdated) {
      expect(saved.updatedAt.getTime()).to.be.at.least(oldUpdated.getTime())
    }
  })
})
