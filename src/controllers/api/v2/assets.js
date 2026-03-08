const _ = require('lodash')
const Asset = require('../../../models/asset')
const Ticket = require('../../../models/ticket')
const apiUtil = require('../apiUtils')
const pdfGenerator = require('../../../helpers/pdfGenerator')

const assetsApi = {}

assetsApi.get = async function (req, res) {
  try {
    const assets = await Asset.getAll()
    return apiUtil.sendApiSuccess(res, { assets })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.single = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const asset = await Asset.getById(id)
    if (!asset) return apiUtil.sendApiError(res, 404, 'Asset not found')
    return apiUtil.sendApiSuccess(res, { asset })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.create = async function (req, res) {
  const postData = req.body
  if (!postData) return apiUtil.sendApiError_InvalidPostData(res)

  try {
    const asset = await Asset.create({
      name: postData.name,
      assetTag: postData.assetTag,
      category: postData.category,
      location: postData.location,
      description: postData.description
    })

    return apiUtil.sendApiSuccess(res, { asset })
  } catch (err) {
    if (err.code === 11000) return apiUtil.sendApiError(res, 400, 'Asset tag already exists')
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.update = async function (req, res) {
  const id = req.params.id
  const postData = req.body
  if (!id || !postData) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const asset = await Asset.findById(id)
    if (!asset) return apiUtil.sendApiError(res, 404, 'Asset not found')

    const allowedFields = ['name', 'assetTag', 'category', 'location', 'description']

    for (let i = 0; i < allowedFields.length; i++) {
      const field = allowedFields[i]
      if (!_.isUndefined(postData[field])) {
        asset[field] = postData[field]
      }
    }

    await asset.save()
    return apiUtil.sendApiSuccess(res, { asset })
  } catch (err) {
    if (err.code === 11000) return apiUtil.sendApiError(res, 400, 'Asset tag already exists')
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.delete = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const asset = await Asset.findById(id)
    if (!asset) return apiUtil.sendApiError(res, 404, 'Asset not found')

    await Asset.deleteOne({ _id: id })
    return apiUtil.sendApiSuccess(res)
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.exportPdf = async function (req, res) {
  try {
    const assets = await Asset.getAll()
    return pdfGenerator.generateAssetListPdf(assets, res)
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

assetsApi.linkTicket = async function (req, res) {
  const assetId = req.params.id
  const ticketUid = req.body.ticketUid
  if (!assetId || !ticketUid) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    let asset = await Asset.findById(assetId)
    if (!asset) return apiUtil.sendApiError(res, 404, 'Asset not found')

    const ticket = await Ticket.getTicketByUid(ticketUid)
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
    return apiUtil.sendApiSuccess(res, { asset })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

module.exports = assetsApi
