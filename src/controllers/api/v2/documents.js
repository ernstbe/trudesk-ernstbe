const _ = require('lodash')
const path = require('path')
const fs = require('fs-extra')
const Chance = require('chance')
const Document = require('../../../models/document')
const apiUtil = require('../apiUtils')

const documentsApi = {}

documentsApi.get = async function (req, res) {
  try {
    const documents = await Document.getAll()
    return apiUtil.sendApiSuccess(res, { documents })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

documentsApi.single = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const document = await Document.getById(id)
    if (!document) return apiUtil.sendApiError(res, 404, 'Document not found')
    return apiUtil.sendApiSuccess(res, { document })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

documentsApi.create = async function (req, res) {
  const contentType = req.headers['content-type'] || ''

  // Handle JSON requests (for testing or metadata-only creation)
  if (contentType.indexOf('application/json') !== -1) {
    const postData = req.body
    if (!postData || !postData.name) return apiUtil.sendApiError_InvalidPostData(res)

    try {
      const doc = await Document.create({
        name: postData.name,
        description: postData.description,
        filename: postData.filename || 'placeholder.dat',
        originalFilename: postData.originalFilename || postData.name,
        mimetype: postData.mimetype || 'application/octet-stream',
        size: postData.size || 0,
        category: postData.category,
        linkedAsset: postData.linkedAsset,
        linkedTicket: postData.linkedTicket,
        uploadedBy: req.user._id
      })

      const document = await Document.getById(doc._id)
      return apiUtil.sendApiSuccess(res, { document })
    } catch (err) {
      return apiUtil.sendApiError(res, 500, err.message)
    }
  }

  // Handle multipart/form-data file upload
  try {
    const Busboy = require('busboy')
    const busboy = Busboy({
      headers: req.headers,
      limits: {
        files: 1,
        fileSize: 50 * 1024 * 1024 // 50mb limit
      }
    })

    const chance = new Chance()
    const fields = {}
    let fileInfo = null
    let error = null

    busboy.on('field', function (fieldname, val) {
      fields[fieldname] = val
    })

    busboy.on('file', function (name, file, info) {
      const filename = info.filename
      const mimetype = info.mimeType

      const ext = path.extname(filename)
      const sanitizedFilename = chance.hash({ length: 20 }) + ext
      const savePath = path.join(__dirname, '../../../../public/uploads/documents')

      if (!fs.existsSync(savePath)) fs.ensureDirSync(savePath)

      const filePath = path.join(savePath, sanitizedFilename)
      let fileSize = 0

      file.on('data', function (data) {
        fileSize += data.length
      })

      file.on('limit', function () {
        error = { status: 400, message: 'File size exceeds limit (50MB)' }
        file.resume()
      })

      fileInfo = {
        filename: sanitizedFilename,
        originalFilename: filename,
        mimetype,
        filePath
      }

      file.on('end', function () {
        fileInfo.size = fileSize
      })

      file.pipe(fs.createWriteStream(filePath))
    })

    busboy.on('finish', async function () {
      if (error) return res.status(error.status || 500).send(error.message)

      if (!fields.name) {
        return apiUtil.sendApiError(res, 400, 'Name is required')
      }

      try {
        const docData = {
          name: fields.name,
          description: fields.description,
          category: fields.category,
          linkedAsset: fields.linkedAsset || undefined,
          linkedTicket: fields.linkedTicket || undefined,
          uploadedBy: req.user._id
        }

        if (fileInfo) {
          docData.filename = fileInfo.filename
          docData.originalFilename = fileInfo.originalFilename
          docData.mimetype = fileInfo.mimetype
          docData.size = fileInfo.size
        } else {
          docData.filename = 'placeholder.dat'
          docData.originalFilename = fields.name
          docData.mimetype = 'application/octet-stream'
          docData.size = 0
        }

        const doc = await Document.create(docData)
        const document = await Document.getById(doc._id)
        return apiUtil.sendApiSuccess(res, { document })
      } catch (err) {
        return apiUtil.sendApiError(res, 500, err.message)
      }
    })

    req.pipe(busboy)
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

documentsApi.update = async function (req, res) {
  const id = req.params.id
  const postData = req.body
  if (!id || !postData) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const doc = await Document.findById(id)
    if (!doc) return apiUtil.sendApiError(res, 404, 'Document not found')

    const allowedFields = ['name', 'description', 'category', 'linkedAsset', 'linkedTicket']

    for (let i = 0; i < allowedFields.length; i++) {
      const field = allowedFields[i]
      if (!_.isUndefined(postData[field])) {
        doc[field] = postData[field]
      }
    }

    await doc.save()
    const document = await Document.getById(doc._id)
    return apiUtil.sendApiSuccess(res, { document })
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

documentsApi.delete = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const doc = await Document.findById(id)
    if (!doc) return apiUtil.sendApiError(res, 404, 'Document not found')

    // Remove file from disk if it exists
    if (doc.filename && doc.filename !== 'placeholder.dat') {
      const filePath = path.join(__dirname, '../../../../public/uploads/documents', doc.filename)
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    await Document.deleteOne({ _id: id })
    return apiUtil.sendApiSuccess(res)
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

documentsApi.download = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtil.sendApiError(res, 400, 'Invalid Parameters')

  try {
    const doc = await Document.findById(id)
    if (!doc) return apiUtil.sendApiError(res, 404, 'Document not found')

    const filePath = path.join(__dirname, '../../../../public/uploads/documents', doc.filename)
    if (!fs.existsSync(filePath)) {
      return apiUtil.sendApiError(res, 404, 'File not found on disk')
    }

    res.set('Content-Disposition', 'attachment; filename="' + doc.originalFilename + '"')
    if (doc.mimetype) res.set('Content-Type', doc.mimetype)

    const fileStream = fs.createReadStream(filePath)
    fileStream.pipe(res)
  } catch (err) {
    return apiUtil.sendApiError(res, 500, err.message)
  }
}

module.exports = documentsApi
