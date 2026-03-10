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
const userSchema = require('../models/user')
const groupSchema = require('../models/group')
const permissions = require('../permissions')

const groupsController = {}

groupsController.content = {}

groupsController.get = async function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'groups:view')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Gruppen'
  content.nav = 'groups'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.groups = {}
  content.data.users = []

  try {
    const groups = await groupSchema.getAllGroups()
    content.data.groups = _.sortBy(groups, 'name')

    const users = await userSchema.findAll()
    content.data.users = _.sortBy(users, 'fullname')

    return res.render('groups', content)
  } catch (err) {
    return res.render('error', { layout: false, error: err, message: err.message })
  }
}

groupsController.getCreate = async function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'groups:create')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Gruppen'
  content.nav = 'groups'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.groups = {}
  content.data.users = []

  try {
    const users = await userSchema.findAll()
    content.data.users = _.sortBy(users, 'fullname')

    return res.render('subviews/createGroup', content)
  } catch (err) {
    return res.render('error', { layout: false, error: err, message: err.message })
  }
}

groupsController.edit = async function (req, res) {
  const user = req.user
  if (_.isUndefined(user) || !permissions.canThis(user.role, 'groups:edit')) {
    req.flash('message', 'Permission Denied.')
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Gruppen'
  content.nav = 'groups'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.users = []
  const groupId = req.params.id
  if (_.isUndefined(groupId)) return res.redirect('/groups/')

  try {
    const users = await userSchema.findAll()
    const group = await groupSchema.getGroupById(groupId)

    content.data.users = _.sortBy(users, 'fullname')
    content.data.group = group

    return res.render('subviews/editGroup', content)
  } catch (err) {
    return res.render('error', { layout: false, error: err, message: err.message })
  }
}

module.exports = groupsController
