const RecurringTask = require('../../../models/recurringTask')
const Ticket = require('../../../models/ticket')
const apiUtil = require('../apiUtils')

const calendarApi = {}

calendarApi.getEvents = async function (req, res) {
  const start = req.query.start
  const end = req.query.end
  if (!start || !end) return apiUtil.sendApiError(res, 400, 'start and end (ISO dates) are required')

  const startDate = new Date(start)
  const endDate = new Date(end)
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
    return apiUtil.sendApiError(res, 400, 'Invalid date format')
  }

  try {
    const events = []

    // Recurring tasks with nextRun in range
    const tasks = await RecurringTask.find({
      enabled: true,
      nextRun: { $gte: startDate, $lte: endDate }
    }).exec()

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i]
      events.push({
        id: 'task-' + task._id.toString(),
        title: task.name,
        start: task.nextRun.toISOString(),
        type: 'recurring-task',
        color: '#4CAF50',
        resourceId: task._id.toString()
      })
    }

    // Tickets with dueDate in range
    const tickets = await Ticket.find({
      deleted: false,
      dueDate: { $gte: startDate, $lte: endDate }
    })
      .populate('status priority')
      .exec()

    const now = new Date()
    for (let i = 0; i < tickets.length; i++) {
      const ticket = tickets[i]
      const isOverdue = ticket.dueDate < now
      const color = isOverdue ? '#F44336' : '#2196F3'

      events.push({
        id: 'ticket-' + ticket._id.toString(),
        title: ticket.subject,
        start: ticket.dueDate.toISOString(),
        type: 'ticket-deadline',
        color,
        resourceId: ticket._id.toString(),
        resourceUid: ticket.uid
      })
    }

    return apiUtil.sendApiSuccess(res, { events })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

module.exports = calendarApi
