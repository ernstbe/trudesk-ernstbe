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

var _ = require('lodash')
var userSchema = require('../../../models/user')
var permissions = require('../../../permissions')
const socketEventConsts = require('../../../socketio/socketEventConsts')

var rolesV1 = {}

rolesV1.get = async function (req, res) {
  try {
    var roleSchema = require('../../../models/role')
    var roleOrderSchema = require('../../../models/roleorder')

    var [roles, roleOrder] = await Promise.all([
      roleSchema.find({}),
      roleOrderSchema.getOrder()
    ])

    return res.json({ success: true, roles: roles, roleOrder: roleOrder })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

rolesV1.create = async function (req, res) {
  var name = req.body.name
  if (!name) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    var roleSchema = require('../../../models/role')
    var roleOrder = require('../../../models/roleorder')

    var role = await roleSchema.create({ name: name })
    if (!role) throw new Error('Invalid Role')

    var ro = await roleOrder.getOrder()
    ro.order.push(role._id)
    var savedRo = await ro.save()

    global.roleOrder = savedRo
    global.roles.push(role)

    return res.json({ success: true, role: role, roleOrder: savedRo })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

rolesV1.update = async function (req, res) {
  var _id = req.params.id
  var data = req.body
  if (_.isUndefined(_id) || _.isUndefined(data))
    return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    var emitter = require('../../../emitter')
    var hierarchy = data.hierarchy ? data.hierarchy : false
    var cleaned = _.omit(data, ['_id', 'hierarchy'])
    var k = permissions.buildGrants(cleaned)
    var roleSchema = require('../../../models/role')
    var role = await roleSchema.get(data._id)
    await role.updateGrantsAndHierarchy(k, hierarchy)

    emitter.emit(socketEventConsts.ROLES_FLUSH)

    return res.send('OK')
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

rolesV1.delete = async function (req, res) {
  var _id = req.params.id
  var newRoleId = req.body.newRoleId
  if (!_id || !newRoleId) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  try {
    var roleSchema = require('../../../models/role')
    var roleOrderSchema = require('../../../models/roleorder')

    await userSchema.updateMany({ role: _id }, { $set: { role: newRoleId } })
    await roleSchema.deleteOne({ _id: _id })

    var ro = await roleOrderSchema.getOrder()
    await ro.removeFromOrder(_id)

    await permissions.register()

    return res.json({ success: true })
  } catch (err) {
    return res.status(500).json({ success: false, error: err })
  }
}

module.exports = rolesV1
