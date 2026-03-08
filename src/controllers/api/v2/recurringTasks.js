const _ = require('lodash')
const RecurringTask = require('../../../models/recurringTask')
const apiUtil = require('../apiUtils')

const recurringTasksApi = {}

recurringTasksApi.get = async function (req, res) {
  try {
    const tasks = await RecurringTask.getAll()
    return apiUtil.sendApiSuccess(res, { recurringTasks: tasks })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

recurringTasksApi.single = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const task = await RecurringTask.getById(id)
    if (!task) return apiUtil.sendApiError(res, 404, 'Recurring task not found')
    return apiUtil.sendApiSuccess(res, { recurringTask: task })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

recurringTasksApi.create = async function (req, res) {
  const postData = req.body
  if (!postData) return apiUtil.sendApiError_InvalidPostData(res)

  try {
    let task = await RecurringTask.create({
      name: postData.name,
      description: postData.description,
      ticketSubject: postData.ticketSubject,
      ticketIssue: postData.ticketIssue,
      ticketType: postData.ticketType,
      ticketGroup: postData.ticketGroup,
      ticketPriority: postData.ticketPriority,
      ticketAssignee: postData.ticketAssignee,
      ticketTags: postData.ticketTags,
      scheduleType: postData.scheduleType,
      dayOfMonth: postData.dayOfMonth,
      monthsOfYear: postData.monthsOfYear,
      daysBeforeDeadline: postData.daysBeforeDeadline,
      enabled: postData.enabled !== false,
      createdBy: req.user._id
    })

    task = await RecurringTask.getById(task._id)
    return apiUtil.sendApiSuccess(res, { recurringTask: task })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

recurringTasksApi.update = async function (req, res) {
  const id = req.params.id
  const postData = req.body
  if (!id || !postData) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    let task = await RecurringTask.findById(id)
    if (!task) return apiUtil.sendApiError(res, 404, 'Recurring task not found')

    const allowedFields = [
      'name', 'description', 'ticketSubject', 'ticketIssue', 'ticketType',
      'ticketGroup', 'ticketPriority', 'ticketAssignee', 'ticketTags',
      'scheduleType', 'dayOfMonth', 'monthsOfYear', 'daysBeforeDeadline', 'enabled'
    ]

    for (let i = 0; i < allowedFields.length; i++) {
      const field = allowedFields[i]
      if (!_.isUndefined(postData[field])) {
        task[field] = postData[field]
      }
    }

    // Recalculate next run when schedule changes
    task.nextRun = RecurringTask.calculateNextRun(task)

    await task.save()
    task = await RecurringTask.getById(task._id)
    return apiUtil.sendApiSuccess(res, { recurringTask: task })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

recurringTasksApi.delete = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const task = await RecurringTask.findById(id)
    if (!task) return apiUtil.sendApiError(res, 404, 'Recurring task not found')

    await RecurringTask.deleteOne({ _id: id })
    return apiUtil.sendApiSuccess(res)
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

module.exports = recurringTasksApi
