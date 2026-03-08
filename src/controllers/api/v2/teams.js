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
 *  Updated:    3/14/19 12:31 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const _ = require('lodash')
const Team = require('../../../models/team')
const apiUtils = require('../apiUtils')

const apiTeams = {}

apiTeams.get = async function (req, res) {
  let limit = 10
  if (!_.isUndefined(req.query.limit)) {
    try {
      limit = parseInt(req.query.limit)
    } catch (err) {
      limit = 10
    }
  }

  let page = 0
  if (req.query.page) {
    try {
      page = parseInt(req.query.page)
    } catch (err) {
      page = 0
    }
  }

  const obj = {
    limit,
    page
  }

  try {
    const results = await Team.getWithObject(obj)
    return apiUtils.sendApiSuccess(res, { count: results.length, teams: results })
  } catch (err) {
    return apiUtils.sendApiError(res, 400, err.message)
  }
}

apiTeams.create = async function (req, res) {
  const postData = req.body
  if (!postData) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    let team = await Team.create(postData)
    team = await team.populate('members')
    return apiUtils.sendApiSuccess(res, { team })
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

apiTeams.update = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtils.sendApiError(res, 400, 'Invalid Team Id')

  const putData = req.body
  if (!putData) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    let team = await Team.findOne({ _id: id })
    if (!team) return apiUtils.sendApiError(res, 400, 'Invalid Team')

    if (putData.name) team.name = putData.name
    if (putData.members) team.members = putData.members

    team = await team.save()
    team = await team.populate('members')
    return apiUtils.sendApiSuccess(res, { team })
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

apiTeams.delete = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtils.sendApiError(res, 400, 'Invalid Team Id')

  try {
    const success = await Team.deleteOne({ _id: id })
    if (!success) return apiUtils.sendApiError(res, 500, 'Unable to delete team. Contact your administrator.')

    return apiUtils.sendApiSuccess(res, { _id: id })
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

module.exports = apiTeams
