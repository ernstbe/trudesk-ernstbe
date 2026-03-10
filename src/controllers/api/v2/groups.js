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
 *  Updated:    4/8/19 1:00 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const apiUtils = require('../apiUtils')
const Ticket = require('../../../models/ticket')
const Group = require('../../../models/group')
const Department = require('../../../models/department')

const apiGroups = {}

apiGroups.create = async function (req, res) {
  const postGroup = req.body
  if (!postGroup) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    let group = await Group.create(postGroup)
    group = await group.populate('members sendMailTo')
    return apiUtils.sendApiSuccess(res, { group })
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

apiGroups.get = async function (req, res) {
  const limit = Number(req.query.limit) || 50
  const page = Number(req.query.page) || 0
  const type = req.query.type || 'user'

  try {
    if (type === 'all') {
      const groups = await Group.getWithObject({ limit, page })
      return apiUtils.sendApiSuccess(res, { groups, count: groups.length })
    } else {
      if (req.user.role.isAdmin || req.user.role.isAgent) {
        const groups = await Department.getDepartmentGroupsOfUser(req.user._id)
        return apiUtils.sendApiSuccess(res, { groups, count: groups.length })
      } else {
        const groups = await Group.getAllGroupsOfUser(req.user._id)
        return apiUtils.sendApiSuccess(res, { groups, count: groups.length })
      }
    }
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

apiGroups.update = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtils.sendApiError(res, 400, 'Invalid Group Id')

  const putData = req.body
  if (!putData) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    let group = await Group.findOne({ _id: id })
    if (!group) return apiUtils.sendApiError(res, 400, 'Invalid Group')

    if (putData.name) group.name = putData.name
    if (putData.members) group.members = putData.members
    if (putData.sendMailTo) group.sendMailTo = putData.sendMailTo

    group = await group.save()
    group = await group.populate('members sendMailTo')
    return apiUtils.sendApiSuccess(res, { group })
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

apiGroups.delete = async function (req, res) {
  const id = req.params.id
  if (!id) return apiUtils.sendApiError_InvalidPostData(res)

  try {
    const tickets = await Ticket.countDocuments({ group: { $in: [id] } })
    if (tickets > 0) return apiUtils.sendApiError(res, 400, 'Unable to delete group with tickets.')

    const success = await Group.deleteOne({ _id: id })
    if (!success) return apiUtils.sendApiError(res, 500, 'Unable to delete group. Contact your administrator.')

    return apiUtils.sendApiSuccess(res, { _id: id })
  } catch (err) {
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

module.exports = apiGroups
