/*
      .                             .o8                     oooo
   .o8                             "888                     `888
 .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
   888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
   888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
   888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
   "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 ========================================================================
 Created:    06/27/2016
 Author:     Chris Brame

 **/

const _ = require('lodash')
const emitter = require('../../../emitter')
const winston = require('winston')
const sanitizeHtml = require('sanitize-html')
const SettingsSchema = require('../../../models/setting')
const settingsUtil = require('../../../settings/settingsUtil')
const socketEventConsts = require('../../../socketio/socketEventConsts')

const apiSettings = {}

function defaultApiResponse (err, res) {
  if (err) return res.status(400).json({ success: false, error: err })

  return res.json({ success: true })
}

apiSettings.getSettings = async function (req, res) {
  try {
    const settings = await settingsUtil.getSettings()

    // Sanitize
    if (!req.user.role.isAdmin) {
      delete settings.data.settings.mailerHost
      delete settings.data.settings.mailerSSL
      delete settings.data.settings.mailerPort
      delete settings.data.settings.mailerUsername
      delete settings.data.settings.mailerPassword
      delete settings.data.settings.mailerFrom
      delete settings.data.settings.mailerCheckEnabled
      delete settings.data.settings.mailerCheckPolling
      delete settings.data.settings.mailerCheckHost
      delete settings.data.settings.mailerCheckPort
      delete settings.data.settings.mailerCheckPassword
      delete settings.data.settings.mailerCheckTicketType
      delete settings.data.settings.mailerCheckTicketPriority
      delete settings.data.settings.mailerCheckCreateAccount
      delete settings.data.settings.mailerCheckDeleteMessage
      delete settings.data.settings.tpsEnabled
      delete settings.data.settings.tpsUsername
      delete settings.data.settings.tpsApiKey

      delete settings.data.mailTemplates
    }

    return res.json({ success: true, settings })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

apiSettings.getSingleSetting = async function (req, res) {
  try {
    const settings = await settingsUtil.getSettings()

    const setting = settings.data.settings[req.params.name]
    if (!setting) return res.status(400).json({ success: false, error: 'invalid setting' })

    return res.json({ success: true, setting })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

/**
 * @api {put} /api/v1/settings/:setting Update Setting
 * @apiName updateSetting
 * @apiDescription Updates given Setting with given Post Data
 * @apiVersion 0.1.7
 * @apiGroup Setting
 * @apiHeader {string} accesstoken The access token for the logged in user
 *
 * @apiParamExample {json} Request-Example:
 * {
 *      "name": "setting:name",
 *      "value": {setting value},
 * }
 *
 * @apiExample Example usage:
 * curl -H "Content-Type: application/json"
        -H "accesstoken: {accesstoken}"
        -X PUT -d "{\"name\": {name},\"value\": \"{value}\"}"
        -l http://localhost/api/v1/settings/:setting
 *
 * @apiSuccess {boolean} success Successful?
 *
 * @apiError InvalidPostData The data was invalid
 * @apiErrorExample
 *      HTTP/1.1 400 Bad Request
 {
     "error": "Invalid Post Data"
 }
 */
apiSettings.updateSetting = async function (req, res) {
  let postData = req.body
  if (_.isUndefined(postData)) return res.status(400).json({ success: false, error: 'Invalid Post Data' })

  if (!_.isArray(postData)) postData = [postData]

  try {
    const updatedSettings = []

    for (const item of postData) {
      let s = await SettingsSchema.getSettingByName(item.name)
      if (_.isNull(s) || _.isUndefined(s)) {
        s = new SettingsSchema({
          name: item.name
        })
      }

      if (s.name === 'legal:privacypolicy') {
        item.value = sanitizeHtml(item.value, {
          allowedTags: false
        })
      }

      s.value = item.value

      const savedSetting = await s.save()
      updatedSettings.push(savedSetting)
    }

    return res.json({ success: true, updatedSettings })
  } catch (err) {
    return res.status(400).json({ success: false, error: err })
  }
}

apiSettings.testMailer = function (req, res) {
  const mailer = require('../../../mailer')
  mailer.verify(function (err) {
    if (err) {
      winston.debug(err)
      return res.status(400).json({ success: false, error: err.code ? err.code : 'See Console' })
    }

    return res.json({ success: true })
  })
}

apiSettings.updateTemplateSubject = async function (req, res) {
  try {
    const templateSchema = require('../../../models/template')
    const id = req.params.id
    let subject = req.body.subject
    if (!subject) return res.status(400).json({ sucess: false, error: 'Invalid PUT data' })
    subject = subject.trim()

    const template = await templateSchema.findOne({ _id: id })
    if (!template) return res.status(404).json({ success: false, error: 'No Template Found' })

    template.subject = subject

    await template.save()
    return res.json({ success: true })
  } catch (err) {
    return defaultApiResponse(err, res)
  }
}

apiSettings.buildsass = function (req, res) {
  const buildsass = require('../../../sass/buildsass')
  buildsass.build(function (err) {
    return defaultApiResponse(err, res)
  })
}

apiSettings.updateRoleOrder = async function (req, res) {
  if (!req.body.roleOrder) return res.status(400).json({ success: false, error: 'Invalid PUT Data' })

  try {
    const RoleOrderSchema = require('../../../models/roleorder')
    let order = await RoleOrderSchema.getOrder()
    if (!order) {
      order = new RoleOrderSchema({
        order: req.body.roleOrder
      })
      const savedOrder = await order.save()

      emitter.emit(socketEventConsts.ROLES_FLUSH)

      return res.json({ success: true, roleOrder: savedOrder })
    } else {
      const updatedOrder = await order.updateOrder(req.body.roleOrder)

      emitter.emit(socketEventConsts.ROLES_FLUSH)

      return res.json({ success: true, roleOrder: updatedOrder })
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = apiSettings
