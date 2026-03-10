const mongoose = require('mongoose')

const COLLECTION = 'documents'

const documentSchema = mongoose.Schema({
  name: { type: String, required: true },
  description: { type: String },
  filename: { type: String, required: true },
  originalFilename: { type: String, required: true },
  mimetype: { type: String },
  size: { type: Number },
  category: { type: String },
  linkedAsset: { type: mongoose.Schema.Types.ObjectId, ref: 'assets' },
  linkedTicket: { type: mongoose.Schema.Types.ObjectId, ref: 'tickets' },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'accounts', required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
})

documentSchema.pre('save', function () {
  this.updatedAt = new Date()
})

documentSchema.statics.getAll = async function () {
  return this.model(COLLECTION)
    .find({})
    .populate('linkedAsset linkedTicket uploadedBy')
    .sort({ createdAt: -1 })
    .exec()
}

documentSchema.statics.getById = async function (id) {
  return this.model(COLLECTION)
    .findOne({ _id: id })
    .populate('linkedAsset linkedTicket uploadedBy')
    .exec()
}

documentSchema.statics.getByAsset = async function (assetId) {
  return this.model(COLLECTION)
    .find({ linkedAsset: assetId })
    .populate('linkedAsset linkedTicket uploadedBy')
    .sort({ createdAt: -1 })
    .exec()
}

documentSchema.statics.getByTicket = async function (ticketId) {
  return this.model(COLLECTION)
    .find({ linkedTicket: ticketId })
    .populate('linkedAsset linkedTicket uploadedBy')
    .sort({ createdAt: -1 })
    .exec()
}

module.exports = mongoose.model(COLLECTION, documentSchema)
