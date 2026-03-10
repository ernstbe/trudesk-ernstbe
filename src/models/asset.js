const mongoose = require('mongoose')

const COLLECTION = 'assets'

const assetSchema = mongoose.Schema({
  name: { type: String, required: true },
  assetTag: { type: String, unique: true, required: true },
  category: { type: String },
  location: { type: String },
  description: { type: String },
  tickets: [{ type: mongoose.Schema.Types.ObjectId, ref: 'tickets' }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
})

assetSchema.pre('save', function () {
  this.updatedAt = new Date()
})

assetSchema.statics.getAll = async function () {
  return this.model(COLLECTION)
    .find({})
    .sort({ name: 1 })
    .exec()
}

assetSchema.statics.getById = async function (id) {
  return this.model(COLLECTION)
    .findOne({ _id: id })
    .populate({
      path: 'tickets',
      select: 'uid subject status priority date',
      populate: [
        { path: 'status', select: 'name htmlColor' },
        { path: 'priority', select: 'name htmlColor' }
      ]
    })
    .exec()
}

assetSchema.statics.getByAssetTag = async function (tag) {
  return this.model(COLLECTION)
    .findOne({ assetTag: tag })
    .exec()
}

assetSchema.statics.addTicket = async function (assetId, ticketId) {
  return this.model(COLLECTION)
    .updateOne({ _id: assetId }, { $addToSet: { tickets: ticketId }, $set: { updatedAt: new Date() } })
    .exec()
}

module.exports = mongoose.model(COLLECTION, assetSchema)
