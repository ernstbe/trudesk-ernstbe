var _ = require('lodash')
var Asset = require('../../../models/asset')
var Ticket = require('../../../models/ticket')
var apiUtil = require('../apiUtils')

var assetsApi = {}

assetsApi.get = async function (req, res) {
  try {
    var assets = await Asset.getAll()
    return apiUtil.sendApiSuccess(res, { assets: assets })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.single = async function (req, res) {
  var id = req.params.id
  if (!id) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    var asset = await Asset.getById(id)
    if (!asset) return apiUtil.sendApiError(res, 404, 'Asset not found')
    return apiUtil.sendApiSuccess(res, { asset: asset })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.create = async function (req, res) {
  var postData = req.body
  if (!postData) return apiUtil.sendApiError_InvalidPostData(res)

  try {
    var asset = await Asset.create({
      name: postData.name,
      assetTag: postData.assetTag,
      category: postData.category,
      location: postData.location,
      description: postData.description
    })

    return apiUtil.sendApiSuccess(res, { asset: asset })
  } catch (err) {
    if (err.code === 11000) return apiUtil.sendApiError(res, 400, 'Asset tag already exists')
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.update = async function (req, res) {
  var id = req.params.id
  var postData = req.body
  if (!id || !postData) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    var asset = await Asset.findById(id)
    if (!asset) return apiUtil.sendApiError(res, 404, 'Asset not found')

    var allowedFields = ['name', 'assetTag', 'category', 'location', 'description']

    for (var i = 0; i < allowedFields.length; i++) {
      var field = allowedFields[i]
      if (!_.isUndefined(postData[field])) {
        asset[field] = postData[field]
      }
    }

    await asset.save()
    return apiUtil.sendApiSuccess(res, { asset: asset })
  } catch (err) {
    if (err.code === 11000) return apiUtil.sendApiError(res, 400, 'Asset tag already exists')
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.delete = async function (req, res) {
  var id = req.params.id
  if (!id) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    var asset = await Asset.findById(id)
    if (!asset) return apiUtil.sendApiError(res, 404, 'Asset not found')

    await Asset.deleteOne({ _id: id })
    return apiUtil.sendApiSuccess(res)
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.linkTicket = async function (req, res) {
  var assetId = req.params.id
  var ticketUid = req.body.ticketUid
  if (!assetId || !ticketUid) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    var asset = await Asset.findById(assetId)
    if (!asset) return apiUtil.sendApiError(res, 404, 'Asset not found')

    var ticket = await Ticket.getTicketByUid(ticketUid)
    if (!ticket) return apiUtil.sendApiError(res, 404, 'Ticket not found')

    // Link asset to ticket metadata
    if (!ticket.metadata) ticket.metadata = {}
    ticket.metadata.assetId = assetId
    ticket.metadata.assetTag = asset.assetTag
    ticket.metadata.assetName = asset.name
    ticket.markModified('metadata')
    ticket.updated = new Date()
    await ticket.save()

    // Add ticket to asset's ticket list
    await Asset.addTicket(assetId, ticket._id)

    asset = await Asset.getById(assetId)
    return apiUtil.sendApiSuccess(res, { asset: asset })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

module.exports = assetsApi
