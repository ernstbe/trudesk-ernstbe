const Ticket = require('../../../models/ticket')
const Status = require('../../../models/ticketStatus')
const RecurringTask = require('../../../models/recurringTask')
const Asset = require('../../../models/asset')
const apiUtil = require('../apiUtils')

const dashboardApi = {}

dashboardApi.widgets = async function (req, res) {
  try {
    // Get Beschluss-related status IDs
    const allStatuses = await Status.getStatus()
    const beschlussStatusIds = allStatuses
      .filter(function (s) {
        return s.name === 'Beschlossen' || s.name === 'In Umsetzung'
      })
      .map(function (s) {
        return s._id
      })

    // Count open Beschluss tickets
    let beschluesse = 0
    if (beschlussStatusIds.length > 0) {
      beschluesse = await Ticket.countDocuments({
        status: { $in: beschlussStatusIds },
        deleted: false
      })
    }

    // Get next 5 upcoming recurring tasks
    const recurringTasks = await RecurringTask.find({ enabled: true })
      .sort({ nextRun: 1 })
      .limit(5)
      .populate('ticketType ticketGroup ticketPriority ticketAssignee createdBy')
      .exec()

    // Get asset stats
    const allAssets = await Asset.getAll()
    const byCategory = {}
    for (const asset of allAssets) {
      const cat = asset.category || 'Sonstiges'
      byCategory[cat] = (byCategory[cat] || 0) + 1
    }

    // Count overdue tickets
    const overdue = await Ticket.countDocuments({
      dueDate: { $lt: new Date() },
      deleted: false,
      status: {
        $in: allStatuses
          .filter(function (s) {
            return !s.isResolved
          })
          .map(function (s) {
            return s._id
          })
      }
    })

    return apiUtil.sendApiSuccess(res, {
      widgets: {
        beschluesse,
        recurringTasks,
        assets: {
          total: allAssets.length,
          byCategory
        },
        overdue
      }
    })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

module.exports = dashboardApi
