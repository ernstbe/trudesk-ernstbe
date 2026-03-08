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
 *  Updated:    3/13/19 12:21 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const _ = require('lodash')
const userSchema = require('../../../models/user')
const permissions = require('../../../permissions')
const socketEventConsts = require('../../../socketio/socketEventConsts')

const rolesV1 = {}

rolesV1.get = async function (req, res) {
  try {
    const roleSchema = require('../../../models/role')
    const roleOrderSchema = require('../../../models/roleorder')

    const [roles, roleOrder] = await Promise.all([
      roleSchema.find({}),
      roleOrderSchema.getOrder()
    ])

    return res.json({ success: true, roles, roleOrder })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

rolesV1.create = async function (req, res) {
  const name = req.body.name
  if (!name) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    const roleSchema = require('../../../models/role')
    const roleOrder = require('../../../models/roleorder')

    const role = await roleSchema.create({ name })
    if (!role) throw new Error('Invalid Role')

    const ro = await roleOrder.getOrder()
    ro.order.push(role._id)
    const savedRo = await ro.save()

    global.roleOrder = savedRo
    global.roles.push(role)

    return res.json({ success: true, role, roleOrder: savedRo })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

rolesV1.update = async function (req, res) {
  const _id = req.params.id
  const data = req.body
  if (_.isUndefined(_id) || _.isUndefined(data)) { return res.status(400).json({ success: false, error: 'Invalid Post Data' }) }

  try {
    const emitter = require('../../../emitter')
    const hierarchy = data.hierarchy ? data.hierarchy : false
    const cleaned = _.omit(data, ['_id', 'hierarchy'])
    const k = permissions.buildGrants(cleaned)
    const roleSchema = require('../../../models/role')
    const role = await roleSchema.get(data._id)
    await role.updateGrantsAndHierarchy(k, hierarchy)

    emitter.emit(socketEventConsts.ROLES_FLUSH)

    return res.send('OK')
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

rolesV1.delete = async function (req, res) {
  const _id = req.params.id
  const newRoleId = req.body.newRoleId
  if (!_id || !newRoleId) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    const roleSchema = require('../../../models/role')
    const roleOrderSchema = require('../../../models/roleorder')

    await userSchema.updateMany({ role: _id }, { $set: { role: newRoleId } })
    await roleSchema.deleteOne({ _id })

    const ro = await roleOrderSchema.getOrder()
    await ro.removeFromOrder(_id)

    await permissions.register()

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err })
  }
}

module.exports = rolesV1
