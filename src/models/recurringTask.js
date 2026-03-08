var mongoose = require('mongoose')

var COLLECTION = 'recurringtasks'

var recurringTaskSchema = mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },

  // Ticket template fields
  ticketSubject: { type: String, required: true },
  ticketIssue: { type: String, required: true },
  ticketType: { type: mongoose.Schema.Types.ObjectId, ref: 'tickettypes', required: true },
  ticketGroup: { type: mongoose.Schema.Types.ObjectId, ref: 'groups', required: true },
  ticketPriority: { type: mongoose.Schema.Types.ObjectId, ref: 'priorities', required: true },
  ticketAssignee: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts' },
  ticketTags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'tags' }],

  // Scheduling
  scheduleType: { type: String, enum: ['monthly', 'quarterly', 'annual'], required: true },
  dayOfMonth: { type: Number, default: 1 },
  monthsOfYear: [{ type: Number }],
  daysBeforeDeadline: { type: Number, default: 30 },

  // State
  enabled: { type: Boolean, default: true },
  lastRun: { type: Date },
  nextRun: { type: Date },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts', required: true },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
})

recurringTaskSchema.pre('save', function (next) {
  this.updatedAt = new Date()

  if (!this.nextRun) {
    this.nextRun = calculateNextRun(this)
  }

  return next()
})

recurringTaskSchema.statics.getAll = async function () {
  return this.model(COLLECTION)
    .find({})
    .populate('ticketType ticketGroup ticketPriority ticketAssignee ticketTags createdBy')
    .sort({ name: 1 })
    .exec()
}

recurringTaskSchema.statics.getById = async function (id) {
  return this.model(COLLECTION)
    .findOne({ _id: id })
    .populate('ticketType ticketGroup ticketPriority ticketAssignee ticketTags createdBy')
    .exec()
}

recurringTaskSchema.statics.getEnabled = async function () {
  return this.model(COLLECTION)
    .find({ enabled: true })
    .exec()
}

function calculateNextRun (task) {
  var now = new Date()
  var year = now.getFullYear()
  var currentMonth = now.getMonth()
  var day = task.dayOfMonth || 1

  var months = []

  if (task.scheduleType === 'monthly') {
    // Every month
    for (var m = 0; m < 12; m++) {
      months.push(m)
    }
  } else if (task.scheduleType === 'quarterly') {
    months = [0, 3, 6, 9] // Jan, Apr, Jul, Oct
  } else if (task.scheduleType === 'annual') {
    months = task.monthsOfYear && task.monthsOfYear.length > 0 ? task.monthsOfYear : [0]
  }

  // Find the next deadline date
  for (var i = 0; i < months.length; i++) {
    var deadline = new Date(year, months[i], day)
    var triggerDate = new Date(deadline)
    triggerDate.setDate(triggerDate.getDate() - (task.daysBeforeDeadline || 30))

    if (triggerDate > now) {
      return triggerDate
    }
  }

  // Wrap to next year
  var firstMonth = months[0] || 0
  var nextYearDeadline = new Date(year + 1, firstMonth, day)
  var nextYearTrigger = new Date(nextYearDeadline)
  nextYearTrigger.setDate(nextYearTrigger.getDate() - (task.daysBeforeDeadline || 30))
  return nextYearTrigger
}

recurringTaskSchema.statics.calculateNextRun = calculateNextRun

module.exports = mongoose.model(COLLECTION, recurringTaskSchema)
