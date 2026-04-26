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

const winston = require('../logger')
const roleSchema = require('../models/role')
const roleOrder = require('../models/roleorder')

const register = async function (callback) {
  const roles = await roleSchema.getRolesLean()
  const ro = await roleOrder.getOrderLean()

  winston.debug('Registering Permissions...')
  global.roleOrder = ro
  global.roles = roles

  if (typeof callback === 'function') return callback()
}

/***
 * Checks to see if a role as the given action
 * @param role [role to check against]
 * @param a [action to check]
 * @param adminOverride [override if admin]
 * @returns {boolean}
 */

const canThis = function (role, a, adminOverride = false) {
  if (role === undefined) return false
  if (adminOverride === true && role.isAdmin) return true

  const roles = global.roles
  if (roles === undefined) return false
  if (role != null && typeof role === 'object' && '_id' in role) role = role._id
  const rolePerm = roles.find(r => r._id.toString() === role.toString())
  if (rolePerm === undefined) return false
  if (rolePerm.grants.indexOf('*') !== -1) return true

  const actionType = a.split(':')[0]
  const action = a.split(':')[1]

  if (actionType === undefined || action === undefined) return false

  const result = rolePerm.grants.filter(function (value) {
    if (value.startsWith(actionType + ':')) return true
    return false
  })

  if (result === undefined || result.length < 1) return false
  if (result.length === 1) {
    if (result[0] === '*') return true
  }

  let typePerm = result[0].split(':')[1].split(' ')
  typePerm = [...new Set(typePerm)]

  if (typePerm.indexOf('*') !== -1) return true

  return typePerm.indexOf(action) !== -1
}

const getRoles = function (action) {
  if (action === undefined) return false

  let rolesWithAction = []
  const roles = global.roles
  if (roles === undefined) return []

  roles.forEach(function (role) {
    const actionType = action.split(':')[0]
    const theAction = action.split(':')[1]

    if (actionType === undefined || theAction === undefined) return
    if (role.grants.indexOf('*') !== -1) {
      rolesWithAction.push(role)
      return
    }

    const result = role.grants.filter(function (value) {
      if (value.startsWith(actionType + ':')) return true
      return false
    })

    if (result === undefined || result.length < 1) return
    if (result.length === 1) {
      if (result[0] === '*') {
        rolesWithAction.push(role)
        return
      }
    }

    let typePerm = result[0].split(':')[1].split(' ')
    typePerm = [...new Set(typePerm)]

    if (typePerm.indexOf('*') !== -1) {
      rolesWithAction.push(role)
      return
    }

    if (typePerm.indexOf(theAction) !== -1) {
      rolesWithAction.push(role)
    }
  })

  rolesWithAction = [...new Set(rolesWithAction)]

  return rolesWithAction
}

function hasHierarchyEnabled (roleId) {
  const role = global.roles.find(function (o) {
    return o._id.toString() === roleId.toString()
  })
  if (role === undefined || role.hierarchy === undefined) return true
  return role.hierarchy
}

function parseRoleHierarchy (roleId) {
  const roleOrder = global.roleOrder.order

  const idx = roleOrder.findIndex(function (i) {
    return i.toString() === roleId.toString()
  })
  if (idx === -1) return []

  return roleOrder.slice(idx)
}

function hasPermOverRole (ownRole, extRole) {
  const roles = parseRoleHierarchy(extRole)

  const i = roles.find(function (o) {
    return o.toString() === ownRole.toString()
  })

  return i !== undefined
}

async function isAdmin (roleId, callback) {
  try {
    const role = await roleSchema.get(roleId)
    return callback(null, role.isAdmin)
  } catch (err) {
    return callback(err)
  }
}

function isAdminSync (roleId) {
  const roles = global.roles
  if (!roles) return false
  const role = roles.find(function (r) {
    return r._id.toString() === roleId.toString()
  })

  if (!role) return false

  return role.isAdmin
}

function buildGrants (obj) {
  return Object.keys(obj).map(function (k) {
    return k + ':' + obj[k].join(' ')
  })
}

module.exports = {
  register,
  flushRoles: register,
  canThis,
  hasHierarchyEnabled,
  parseRoleHierarchy,
  hasPermOverRole,

  getRoles,
  isAdmin,
  isAdminSync,
  buildGrants
}
