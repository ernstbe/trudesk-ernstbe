/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Author:     Chris Brame
 *  Updated:    1/20/19 4:43 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const _ = require('lodash')
const apiTags = {}

/**
 * @api {post} /api/v1/tags/create Creates a tag
 * @apiName createTag
 * @apiDescription Create a tag
 * @apiVersion 0.1.6
 * @apiGroup Tags
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json" -H "accesstoken: {accesstoken}" -X POST -d "{\"tag\": {tag}}" -l http://localhost/api/v1/tags/create
 *
 * @apiParamExample {json} Request-Example:
 {
     "tag": {tag}
 }
 *
 * @apiSuccess {boolean} success Successfully?
 * @apiSuccess {boolean} tag Saved Tag
 *
 * @apiError InvalidPostData Invalid Post Data
 */
apiTags.createTag = async function (req, res) {
  try {
    const data = req.body
    if (_.isUndefined(data.tag)) return res.status(400).json({ error: 'Invalid Post Data' })

    const TagSchema = require('../../../models/tag')
    const Tag = new TagSchema({
      name: data.tag
    })

    const T = await Tag.save()
    return res.json({ success: true, tag: T })
  } catch (err) {
    return res.status(400).json({ error: err.message })
  }
}

apiTags.getTagsWithLimit = async function (req, res) {
  try {
    const qs = req.query
    const limit = qs.limit ? qs.limit : 25
    const page = qs.page ? qs.page : 0

    const tagSchema = require('../../../models/tag')
    const result = { success: true }

    const [tags, count] = await Promise.all([
      tagSchema.getTagsWithLimit(parseInt(limit), parseInt(page)),
      tagSchema.countDocuments({})
    ])

    result.tags = tags
    result.count = count

    return res.json(result)
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

/**
 * @api {put} /api/v1/tags/:id Update Tag
 * @apiName updateTag
 * @apiDescription Updates given tag
 * @apiVersion 0.1.7
 * @apiGroup Tags
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tags/:id
 *
 * @apiSuccess {boolean} success Successfully?
 * @apiSuccess {object} tag Updated Tag
 *
 */
apiTags.updateTag = async function (req, res) {
  const id = req.params.id
  const data = req.body
  if (_.isUndefined(id) || _.isNull(id) || _.isNull(data) || _.isUndefined(data)) {
    return res.status(400).json({ success: false, error: 'Invalid Put Data' })
  }

  try {
    const tagSchema = require('../../../models/tag')
    const tag = await tagSchema.getTag(id)

    tag.name = data.name

    const t = await tag.save()
    return res.json({ success: true, tag: t })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

/**
 * @api {delete} /api/v1/tags/:id Delete Tag
 * @apiName deleteTag
 * @apiDescription Deletes the given tag
 * @apiVersion 0.1.7
 * @apiGroup Tags
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiExample Example usage:
 * curl -H "accesstoken: {accesstoken}" -l http://localhost/api/v1/tags/:id
 *
 * @apiSuccess {boolean} success Successfully?
 *
 */
apiTags.deleteTag = async function (req, res) {
  const id = req.params.id
  if (_.isUndefined(id) || _.isNull(id)) return res.status(400).json({ success: false, error: 'Invalid Tag Id' })

  try {
    const ticketModel = require('../../../models/ticket')
    const tickets = await ticketModel.getAllTicketsByTag(id)
    for (const ticket of tickets) {
      ticket.tags = _.reject(ticket.tags, function (o) {
        return o._id.toString() === id.toString()
      })
      await ticket.save()
    }

    const tagSchema = require('../../../models/tag')
    await tagSchema.findByIdAndDelete(id)

    return res.json({ success: true })
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

module.exports = apiTags
