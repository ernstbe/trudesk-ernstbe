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
const winston = require('../logger')
const utils = require('../helpers/utils')
const UserSchema = require('../models/user')
const Role = require('../models/role')
const permissions = require('../permissions')

const events = {}

function register (socket) {
  events.onImportCSV(socket)
  events.onImportJSON(socket)
  events.onImportLDAP(socket)
}

function eventLoop () {}

events.onImportCSV = socket => {
  socket.on('$trudesk:accounts:import:csv', async data => {
    const authUser = socket.request.user
    if (!permissions.canThis(authUser.role, 'accounts:import')) {
      // Send Error Socket Emit
      winston.warn('[$trudesk:accounts:import:csv] - Error: Invalid permissions.')
      utils.sendToSelf(socket, '$trudesk:accounts:import:error', {
        error: 'Invalid Permissions. Check Console.'
      })
      return
    }

    const addedUsers = data.addedUsers
    const updatedUsers = data.updatedUsers

    let completedCount = 0

    for (const addedUser of addedUsers) {
      const data = {
        type: 'csv',
        totalCount: addedUsers.length + updatedUsers.length,
        completedCount,
        item: { username: addedUser.username, state: 1 }
      }

      utils.sendToSelf(socket, '$trudesk:Accounts:import:onStatusChange', data)

      const user = new UserSchema({
        username: addedUser.username,
        fullname: addedUser.fullname,
        email: addedUser.email,
        title: addedUser.title ? addedUser.title : null,
        password: 'Password1!'
      })

      const normalizedRole = addedUser.role ? addedUser.role : 'user'

      try {
        const role = await Role.findOne({ normalized: normalizedRole })
        if (!role) throw new Error('Invalid Role')

        user.role = role._id

        await user.save()
        completedCount++

        data.item.state = 2 // Completed
        setTimeout(() => {
          utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', data)
        }, 150)
      } catch (err) {
        winston.warn(err)
        data.item.state = 3
        utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', data)
      }
    }

    for (const updatedUser of updatedUsers) {
      const data = {
        type: 'csv',
        totalCount: addedUsers.length + updatedUsers.length,
        completedCount,
        item: {
          username: updatedUser.username,
          state: 1
        }
      }

      utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', data)

      try {
        const user = await UserSchema.getUserByUsername(updatedUser.username)
        user.fullname = updatedUser.fullname
        user.title = updatedUser.title
        user.email = updatedUser.email

        if (updatedUser.role) {
          const role = await Role.findOne({ normalized: updatedUser.role })
          if (!role) throw new Error('Invalid Role')
          user.role = role._id
        }

        await user.save()
        completedCount++
        data.item.state = 2
        data.completedCount = completedCount
        setTimeout(function () {
          utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', data)
        }, 150)
      } catch (err) {
        winston.warn(err)
        data.item.state = 3
        utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', data)
      }
    }
  })
}

events.onImportJSON = function (socket) {
  socket.on('$trudesk:accounts:import:json', async function (data) {
    const authUser = socket.request.user
    if (!permissions.canThis(authUser.role, 'accounts:import')) {
      // Send Error Socket Emit
      winston.warn('[$trudesk:accounts:import:json] - Error: Invalid permissions.')
      utils.sendToSelf(socket, '$trudesk:accounts:import:error', {
        error: 'Invalid Permissions. Check Console.'
      })
      return
    }

    const addedUsers = data.addedUsers
    const updatedUsers = data.updatedUsers

    let completedCount = 0

    // Process added users sequentially (was async.eachSeries)
    for (const cu of addedUsers) {
      const addData = {
        type: 'json',
        totalCount: addedUsers.length + updatedUsers.length,
        completedCount,
        item: {
          username: cu.username,
          state: 1
        }
      }

      utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', addData)

      const user = new UserSchema({
        username: cu.username,
        fullname: cu.fullname,
        email: cu.email,
        password: 'Password1!'
      })

      if (!_.isUndefined(cu.role)) {
        user.role = cu.role
      } else {
        user.role = 'user'
      }

      if (!_.isUndefined(cu.title)) {
        user.title = cu.title
      }

      try {
        await user.save()
        completedCount++
        // Send update
        addData.completedCount = completedCount
        addData.item.state = 2 // Completed
        await new Promise(resolve => setTimeout(resolve, 150))
        utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', addData)
      } catch (err) {
        winston.warn(err)
        addData.item.state = 3
        utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', addData)
      }
    }

    // Process updated users sequentially
    for (const uu of updatedUsers) {
      const updateData = {
        type: 'json',
        totalCount: addedUsers.length + updatedUsers.length,
        completedCount,
        item: {
          username: uu.username,
          state: 1 // Starting
        }
      }
      utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', updateData)
      try {
        const existingUser = await UserSchema.getUserByUsername(uu.username)
        existingUser.fullname = uu.fullname
        existingUser.title = uu.title
        existingUser.email = uu.email
        if (!_.isUndefined(uu.role)) {
          existingUser.role = uu.role
        }

        await existingUser.save()
        completedCount++
        updateData.item.state = 2
        updateData.completedCount = completedCount
        setTimeout(function () {
          utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', updateData)
        }, 150)
      } catch (err) {
        winston.warn(err)
        updateData.item.state = 3
        utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', updateData)
      }
    }
  })
}

events.onImportLDAP = function (socket) {
  socket.on('$trudesk:accounts:import:ldap', async function (data) {
    const authUser = socket.request.user
    if (!permissions.canThis(authUser.role, 'accounts:import')) {
      // Send Error Socket Emit
      winston.warn('[$trudesk:accounts:import:ldap] - Error: Invalid permissions.')
      utils.sendToSelf(socket, '$trudesk:accounts:import:error', {
        error: 'Invalid Permissions. Check Console.'
      })
      return
    }

    const addedUsers = data.addedUsers
    const updatedUsers = data.updatedUsers
    let defaultUserRole = null
    let completedCount = 0

    // Step 1: Get default user role setting
    try {
      const settingSchema = require('../models/setting')
      const setting = await settingSchema.getSetting('role:user:default')
      if (!setting) {
        utils.sendToSelf(socket, '$trudesk:accounts:import:error', {
          error: 'Default user role not set. Please contact an Administrator.'
        })
        return
      }
      defaultUserRole = setting.value
    } catch (err) {
      winston.warn(err)
      utils.sendToSelf(socket, '$trudesk:accounts:import:error', {
        error: 'Default user role not set. Please contact an Administrator.'
      })
      return
    }

    // Step 2: Process added users sequentially (was async.eachSeries)
    for (const lu of addedUsers) {
      const addData = {
        type: 'ldap',
        totalCount: addedUsers.length + updatedUsers.length,
        completedCount,
        item: {
          username: lu.sAMAccountName,
          state: 1 // Starting
        }
      }

      utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', addData)

      const user = new UserSchema({
        username: lu.sAMAccountName,
        fullname: lu.displayName,
        email: lu.mail,
        title: lu.title,
        role: defaultUserRole,
        password: 'Password1!'
      })

      try {
        await user.save()
        completedCount++
        // Send update
        addData.completedCount = completedCount
        addData.item.state = 2 // Completed
        await new Promise(resolve => setTimeout(resolve, 150))
        utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', addData)
      } catch (err) {
        winston.warn(err)
        addData.item.state = 3
        utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', addData)
      }
    }

    // Step 3: Process updated users sequentially
    for (const uu of updatedUsers) {
      const updateData = {
        type: 'ldap',
        totalCount: addedUsers.length + updatedUsers.length,
        completedCount,
        item: {
          username: uu.username,
          state: 1 // Starting
        }
      }
      utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', updateData)
      try {
        const existingUser = await UserSchema.getUser(uu._id)
        existingUser.fullname = uu.fullname
        existingUser.title = uu.title
        existingUser.email = uu.email

        await existingUser.save()
        completedCount++
        updateData.item.state = 2
        updateData.completedCount = completedCount
        setTimeout(function () {
          utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', updateData)
        }, 150)
      } catch (err) {
        winston.warn(err)
        updateData.item.state = 3
        utils.sendToSelf(socket, '$trudesk:accounts:import:onStatusChange', updateData)
      }
    }
  })
}

module.exports = {
  events,
  eventLoop,
  register
}
