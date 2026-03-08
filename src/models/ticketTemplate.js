const mongoose = require('mongoose')

const COLLECTION = 'tickettemplates'

const ticketTemplateSchema = mongoose.Schema({
  name: { type: String, required: true, unique: true },
  subject: { type: String, required: true },
  issue: { type: String },
  ticketType: { type: mongoose.Schema.Types.ObjectId, ref: 'tickettypes' },
  group: { type: mongoose.Schema.Types.ObjectId, ref: 'groups' },
  priority: { type: mongoose.Schema.Types.ObjectId, ref: 'priorities' },
  tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'tags' }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
})

ticketTemplateSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  return next()
})

ticketTemplateSchema.statics.getAll = async function () {
  return this.model(COLLECTION)
    .find({})
    .populate('ticketType group priority tags createdBy')
    .sort({ name: 1 })
    .exec()
}

ticketTemplateSchema.statics.getById = async function (id) {
  return this.model(COLLECTION)
    .findOne({ _id: id })
    .populate('ticketType group priority tags createdBy')
    .exec()
}

module.exports = mongoose.model(COLLECTION, ticketTemplateSchema)
