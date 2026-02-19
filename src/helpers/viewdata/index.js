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
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

const _ = require('lodash')
const winston = require('../../logger')
const moment = require('moment')
const settingSchema = require('../../models/setting')
const settingsUtil = require('../../settings/settingsUtil')

const viewController = {}
const viewdata = {}
viewdata.users = {}

viewController.getData = function (request, cb) {
  ;(async () => {
    try {
      // Build sass in development
      if (global.env === 'development') {
        await new Promise((resolve, reject) => {
          require('../../sass/buildsass').build((err) => {
            if (err) return reject(err)
            resolve()
          })
        })
      }

      // Version
      const packageJson = require('../../../package.json')
      viewdata.version = packageJson.version

      // Hostname / host URL
      viewdata.hostname = request.hostname
      viewdata.hosturl = request.protocol + '://' + request.get('host')

      // Run all independent async operations in parallel
      const [
        timeFormatSetting,
        shortDateFormatSetting,
        longDateFormatSetting,
        playNewTicketSoundSetting,
        minSubjectSetting,
        minIssueSetting,
        allowAgentUserTicketsSetting,
        siteTitleSetting,
        siteUrlSetting,
        timezoneSetting,
        customLogoSetting,
        customPageLogoSetting,
        customFaviconSetting,
        activeNotice,
        defaultTicketType,
        showTour,
        showOverdue,
        settingsRes,
        pluginsInfo
      ] = await Promise.all([
        settingSchema.getSetting('gen:timeFormat').catch(() => null),
        settingSchema.getSetting('gen:shortDateFormat').catch(() => null),
        settingSchema.getSetting('gen:longDateFormat').catch(() => null),
        settingSchema.getSetting('playNewTicketSound:enable').catch(() => null),
        settingSchema.getSetting('ticket:minlength:subject').catch(() => null),
        settingSchema.getSetting('ticket:minlength:issue').catch(() => null),
        settingSchema.getSetting('allowAgentUserTickets:enable').catch(() => null),
        settingSchema.getSetting('gen:sitetitle').catch(() => null),
        settingSchema.getSetting('gen:siteurl').catch(() => null),
        settingSchema.getSetting('gen:timezone').catch(() => null),
        settingSchema.getSetting('gen:customlogo').catch(() => null),
        settingSchema.getSetting('gen:custompagelogo').catch(() => null),
        settingSchema.getSetting('gen:customfavicon').catch(() => null),
        viewController.getActiveNotice().catch((err) => { winston.warn(err.message || err); return undefined }),
        viewController.getDefaultTicketType(request).catch(() => undefined),
        viewController.getShowTourSetting(request).catch((err) => { winston.warn(err.message || err); return true }),
        viewController.getOverdueSetting(request).catch((err) => { winston.warn(err.message || err); return true }),
        settingsUtil.getSettings().catch(() => null),
        viewController.getPluginsInfo(request).catch((err) => { winston.warn(err.message || err); return [] })
      ])

      // Date/time formats
      viewdata.timeFormat = (timeFormatSetting && timeFormatSetting.value) ? timeFormatSetting.value : 'hh:mma'
      viewdata.shortDateFormat = (shortDateFormatSetting && shortDateFormatSetting.value) ? shortDateFormatSetting.value : 'MM/DD/YYYY'
      viewdata.longDateFormat = (longDateFormatSetting && longDateFormatSetting.value) ? longDateFormatSetting.value : 'MMM DD, YYYY'

      // Ticket settings
      viewdata.ticketSettings = {}
      viewdata.ticketSettings.playNewTicketSound = (playNewTicketSoundSetting && !_.isUndefined(playNewTicketSoundSetting.value)) ? playNewTicketSoundSetting.value : true
      viewdata.ticketSettings.minSubject = (minSubjectSetting && minSubjectSetting.value) ? minSubjectSetting.value : 10
      viewdata.ticketSettings.minIssue = (minIssueSetting && minIssueSetting.value) ? minIssueSetting.value : 10
      viewdata.ticketSettings.allowAgentUserTickets = (allowAgentUserTicketsSetting && allowAgentUserTicketsSetting.value) ? allowAgentUserTicketsSetting.value : false

      // Site title
      viewdata.siteTitle = (siteTitleSetting && siteTitleSetting.value) ? siteTitleSetting.value : 'Trudesk'

      // Site URL - if not set, create it
      if (!siteUrlSetting) {
        try {
          const createdSetting = await settingSchema.create({
            name: 'gen:siteurl',
            value: viewdata.hosturl
          })
          if (createdSetting && !global.TRUDESK_BASEURL) {
            global.TRUDESK_BASEURL = createdSetting.value
          }
        } catch (e) {
          // ignore creation errors
        }
      }

      // Timezone
      viewdata.timezone = (timezoneSetting && timezoneSetting.value) ? timezoneSetting.value : 'America/New_York'

      // Custom logo
      viewdata.hasCustomLogo = !!(customLogoSetting && customLogoSetting.value)
      if (!viewdata.hasCustomLogo) {
        viewdata.logoImage = '/img/defaultLogoLight.png'
      } else {
        try {
          const logoFileName = await settingSchema.getSetting('gen:customlogofilename')
          if (logoFileName && !_.isUndefined(logoFileName.value)) {
            viewdata.logoImage = '/assets/' + logoFileName.value
          } else {
            viewdata.logoImage = '/img/defaultLogoLight.png'
          }
        } catch (e) {
          viewdata.logoImage = '/img/defaultLogoLight.png'
        }
      }

      // Custom page logo
      viewdata.hasCustomPageLogo = !!(customPageLogoSetting && customPageLogoSetting.value)
      if (!viewdata.hasCustomPageLogo) {
        viewdata.pageLogoImage = '/img/defaultLogoDark.png'
      } else {
        try {
          const pageLogoFileName = await settingSchema.getSetting('gen:custompagelogofilename')
          if (pageLogoFileName && !_.isUndefined(pageLogoFileName.value)) {
            viewdata.pageLogoImage = '/assets/' + pageLogoFileName.value
          } else {
            viewdata.pageLogoImage = '/img/defaultLogoDark.png'
          }
        } catch (e) {
          viewdata.pageLogoImage = '/img/defaultLogoDark.png'
        }
      }

      // Custom favicon
      viewdata.hasCustomFavicon = !!(customFaviconSetting && customFaviconSetting.value)
      if (!viewdata.hasCustomFavicon) {
        viewdata.favicon = '/img/favicon.ico'
      } else {
        try {
          const faviconFilename = await settingSchema.getSetting('gen:customfaviconfilename')
          if (faviconFilename && !_.isUndefined(faviconFilename.value)) {
            viewdata.favicon = '/assets/' + faviconFilename.value
          } else {
            viewdata.favicon = '/img/favicon.ico'
          }
        } catch (e) {
          viewdata.favicon = '/img/favicon.ico'
        }
      }

      // Active notice
      viewdata.notice = activeNotice
      viewdata.noticeCookieName = undefined
      if (!_.isUndefined(activeNotice) && !_.isNull(activeNotice)) {
        viewdata.noticeCookieName = activeNotice.name + '_' + moment(activeNotice.activeDate).format('MMMDDYYYY_HHmmss')
      }

      // Default ticket type
      viewdata.defaultTicketType = defaultTicketType

      // Show tour
      viewdata.showTour = showTour

      // Show overdue
      viewdata.showOverdue = showOverdue

      // Third party & password complexity from settings
      if (settingsRes) {
        viewdata.hasThirdParty = settingsRes.data.settings.hasThirdParty
        viewdata.accountsPasswordComplexity = settingsRes.data.settings.accountsPasswordComplexity.value
      }

      // Plugins
      viewdata.plugins = pluginsInfo
    } catch (err) {
      winston.warn('Error: ' + err)
    }

    return cb(viewdata)
  })()
}

viewController.getActiveNotice = async function () {
  const noticeSchema = require('../../models/notice')
  const notice = await noticeSchema.getActive()
  return notice
}

viewController.getUserNotifications = async function (request) {
  const notificationsSchema = require('../../models/notification')
  const data = await notificationsSchema.findAllForUser(request.user._id)
  return data
}

viewController.getUnreadNotificationsCount = async function (request) {
  const notificationsSchema = require('../../models/notification')
  const count = await notificationsSchema.getUnreadCount(request.user._id)
  return count
}

viewController.getConversations = async function (request) {
  const conversationSchema = require('../../models/chat/conversation')
  const messageSchema = require('../../models/chat/message')
  const conversations = await conversationSchema.getConversationsWithLimit(request.user._id, 10)

  const convos = []

  for (const convo of conversations) {
    const c = convo.toObject()

    const userMeta =
      convo.userMeta[
        _.findIndex(convo.userMeta, function (item) {
          return item.userId.toString() === request.user._id.toString()
        })
      ]
    if (!_.isUndefined(userMeta) && !_.isUndefined(userMeta.deletedAt) && userMeta.deletedAt > convo.updatedAt) {
      continue
    }

    const rm = await messageSchema.getMostRecentMessage(c._id)
    _.each(c.participants, function (p) {
      if (p._id.toString() !== request.user._id.toString()) {
        c.partner = p
      }
    })

    const recentMsg = _.first(rm)
    if (!_.isUndefined(recentMsg)) {
      if (String(c.partner._id) === String(recentMsg.owner._id)) {
        c.recentMessage = c.partner.fullname + ': ' + recentMsg.body
      } else {
        c.recentMessage = 'You: ' + recentMsg.body
      }
    } else {
      c.recentMessage = 'New Conversation'
    }

    convos.push(c)
  }

  return convos
}

viewController.getUsers = async function (request) {
  const userSchema = require('../../models/user')
  if (request.user.role.isAdmin || request.user.role.isAgent) {
    const users = await userSchema.findAll()

    let u = _.reject(users, function (u) {
      return u.deleted === true
    })
    u.password = null
    u.role = null
    u.resetPassHash = null
    u.resetPassExpire = null
    u.accessToken = null
    u.iOSDeviceTokens = null
    u.preferences = null
    u.tOTPKey = null

    u = _.sortBy(u, 'fullname')

    return u
  } else {
    const groupSchema = require('../../models/group')
    const groups = await groupSchema.getAllGroupsOfUser(request.user._id)

    let users = _.map(groups, function (g) {
      return _.map(g.members, function (m) {
        const mFiltered = m
        m.password = null
        m.role = null
        m.resetPassHash = null
        m.resetPassExpire = null
        m.accessToken = null
        m.iOSDeviceTokens = null
        m.preferences = null
        m.tOTPKey = null

        return mFiltered
      })
    })

    users = _.chain(users)
      .flattenDeep()
      .uniqBy(function (i) {
        return i._id
      })
      .sortBy('fullname')
      .value()

    return users
  }
}

viewController.loggedInAccount = async function (request) {
  const userSchema = require('../../models/user')
  const data = await userSchema.getUser(request.user._id)
  return data
}

viewController.getTeams = async function (request) {
  const Team = require('../../models/team')
  return Team.getTeams()
}

viewController.getGroups = async function (request) {
  const groupSchema = require('../../models/group')
  const Department = require('../../models/department')
  if (request.user.role.isAdmin || request.user.role.isAgent) {
    const groups = await Department.getDepartmentGroupsOfUser(request.user._id)
    return groups
  } else {
    let data = await groupSchema.getAllGroupsOfUserNoPopulate(request.user._id)

    const p = require('../../permissions')
    if (p.canThis(request.user.role, 'ticket:public')) {
      const groups = await groupSchema.getAllPublicGroups()
      data = data.concat(groups)
    }

    return data
  }
}

viewController.getTypes = async function (request) {
  const typeSchema = require('../../models/tickettype')
  const data = await typeSchema.getTypes()
  return data
}

viewController.getDefaultTicketType = async function (request) {
  const defaultType = await settingSchema.getSetting('ticket:type:default')

  const typeSchema = require('../../models/tickettype')
  const type = await typeSchema.getType(defaultType.value)
  return type
}

viewController.getPriorities = async function (request) {
  const ticketPrioritySchema = require('../../models/ticketpriority')
  let priorities = await ticketPrioritySchema.getPriorities()
  priorities = _.sortBy(priorities, ['migrationNum', 'name'])
  return priorities
}

viewController.getTags = async function (request) {
  const tagSchema = require('../../models/tag')
  const data = await tagSchema.getTags()
  return data
}

viewController.getOverdueSetting = async function (request) {
  try {
    const data = await settingSchema.getSettingByName('showOverdueTickets:enable')
    if (_.isNull(data)) return true
    return data.value
  } catch (err) {
    winston.debug(err)
    return true
  }
}

viewController.getShowTourSetting = async function (request) {
  if (!request.user) throw new Error('Invalid User')

  try {
    const data = await settingSchema.getSettingByName('showTour:enable')

    if (!_.isNull(data) && !_.isUndefined(data) && data === false) {
      return true
    }

    const userSchema = require('../../models/user')
    const user = await userSchema.getUser(request.user._id)

    let hasTourCompleted = false
    if (user.preferences.tourCompleted) {
      hasTourCompleted = user.preferences.tourCompleted
    }

    if (hasTourCompleted) return false

    if (_.isNull(data)) return true

    return data.value
  } catch (err) {
    winston.debug(err)
    return true
  }
}

viewController.getPluginsInfo = async function (request) {
  const dive = require('dive')
  const path = require('path')
  const fs = require('fs')
  const pluginDir = path.join(__dirname, '../../../plugins')
  if (!fs.existsSync(pluginDir)) fs.mkdirSync(pluginDir)

  const plugins = await new Promise((resolve, reject) => {
    const pluginsList = []
    dive(
      pluginDir,
      { directories: true, files: false, recursive: false },
      function (err, dir) {
        if (err) return reject(err)
        delete require.cache[require.resolve(path.join(dir, '/plugin.json'))]
        const pluginPackage = require(path.join(dir, '/plugin.json'))
        pluginsList.push(pluginPackage)
      },
      function () {
        resolve(_.sortBy(pluginsList, 'name'))
      }
    )
  })

  return plugins
}

module.exports = viewController
