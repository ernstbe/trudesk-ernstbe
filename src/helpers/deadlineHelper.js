const moment = require('moment')

/**
 * Returns the deadline status for a given due date.
 * @param {Date} dueDate - The due date to check
 * @returns {{ status: 'green'|'yellow'|'red'|'overdue', daysRemaining: number }}
 */
function getDeadlineStatus (dueDate) {
  if (!dueDate) {
    return { status: 'green', daysRemaining: Infinity }
  }

  const now = moment().startOf('day')
  const due = moment(dueDate).startOf('day')
  const daysRemaining = due.diff(now, 'days')

  let status
  if (daysRemaining < 0) {
    status = 'overdue'
  } else if (daysRemaining === 0) {
    status = 'red'
  } else if (daysRemaining <= 7) {
    status = 'yellow'
  } else {
    status = 'green'
  }

  return { status, daysRemaining }
}

module.exports = { getDeadlineStatus }
