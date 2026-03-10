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
const path = require('path')
const passport = require('passport')
const winston = require('winston')
const pkg = require('../../package')
const xss = require('xss')
const settingsUtil = require('../settings/settingsUtil')
const RateLimiterMemory = require('rate-limiter-flexible').RateLimiterMemory

const limiterSlowBruteByIP = new RateLimiterMemory({
  keyPrefix: 'login_fail_ip_per_day',
  points: 15,
  duration: 60 * 60 * 24,
  blockDuration: 60 * 60
})

const mainController = {}

mainController.content = {}

mainController.index = async function (req, res) {
  const content = {}
  content.title = 'Login'
  content.layout = false
  content.flash = req.flash('loginMessage')

  try {
    const settingsUtil = require('../settings/settingsUtil')
    const s = await settingsUtil.getSettings()
    const settings = s.data.settings
    content.siteTitle = settings.siteTitle.value

    content.allowUserRegistration = settings.allowUserRegistration.value
    content.mailerEnabled = settings.mailerEnabled.value

    content.colorPrimary = settings.colorPrimary.value
    content.colorSecondary = settings.colorSecondary.value
    content.colorTertiary = settings.colorTertiary.value

    content.pageLogo = '/img/defaultLogoDark.png'
    if (settings.hasCustomPageLogo.value && settings.customPageLogoFilename.value.length > 0) {
      content.pageLogo = '/assets/' + settings.customPageLogoFilename.value
    }

    content.bottom = 'Trudesk v' + pkg.version

    res.render('login', content)
  } catch (err) {
    throw new Error(err)
  }
}

mainController.about = async function (req, res) {
  const pkg = require('../../package.json')
  const marked = require('marked')
  const settings = require('../models/setting')

  try {
    const privacyPolicy = await settings.getSettingByName('legal:privacypolicy')

    const content = {}
    content.title = 'Über'
    content.nav = 'about'

    content.data = {}
    content.data.user = req.user
    content.data.common = req.viewdata

    content.data.version = pkg.version
    if (privacyPolicy === null || _.isUndefined(privacyPolicy.value)) {
      content.data.privacyPolicy = 'No Privacy Policy has been set.'
    } else {
      content.data.privacyPolicy = xss(marked.parse(privacyPolicy.value))
    }

    return res.render('about', content)
  } catch (err) {
    return res.render('error', {
      layout: false,
      error: err,
      message: err.message
    })
  }
}

mainController.dashboard = function (req, res) {
  const content = {}
  content.title = 'Übersicht'
  content.nav = 'dashboard'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata

  return res.render('dashboard', content)
}

mainController.loginPost = async function (req, res, next) {
  let ipAddress = req.ip
  if (process.env.USE_XFORWARDIP === 'true') ipAddress = req.headers['x-forwarded-for']

  if (process.env.USE_USERRATELIMIT === 'true') ipAddress = ipAddress + req.body.username

  const [resEmailAndIP] = await Promise.all([limiterSlowBruteByIP.get(ipAddress)])

  let retrySecs = 0
  if (resEmailAndIP !== null && resEmailAndIP.consumedPoints > 2) {
    retrySecs = Math.round(resEmailAndIP.msBeforeNext / 1000) || 1
  }

  if (retrySecs > 0) {
    res.set('Retry-After', retrySecs.toString())
    // res.status(429).send(`Too many requests. Retry after ${retrySecs} seconds.`)
    res.status(429).render('429', { timeout: retrySecs.toString(), layout: false })
  } else {
    passport.authenticate('local', async function (err, user) {
      if (err) {
        winston.error(err)
        return next(err)
      }
      if (!user) {
        try {
          await limiterSlowBruteByIP.consume(ipAddress)
          return res.redirect('/')
        } catch (rlRejected) {
          if (rlRejected instanceof Error) throw rlRejected
          else {
            const timeout = String(Math.round(rlRejected.msBeforeNext / 1000)) || 1
            res.set('Retry-After', timeout)
            res.status(429).render('429', { timeout, layout: false })
          }
        }
      }

      if (user) {
        let redirectUrl = '/dashboard'

        if (req.session.redirectUrl) {
          redirectUrl = req.session.redirectUrl
          req.session.redirectUrl = null
        }

        if (req.user.role === 'user') {
          redirectUrl = '/tickets'
        }

        req.logIn(user, function (err) {
          if (err) {
            winston.debug(err)
            return next(err)
          }

          return res.redirect(redirectUrl)
        })
      }
    })(req, res, next)
  }
}

mainController.l2AuthPost = function (req, res, next) {
  if (!req.user) {
    return res.redirect('/')
  }

  passport.authenticate('totp', function (err, success) {
    if (err) {
      winston.error(err)
      return next(err)
    }

    if (!success) return res.redirect('/l2auth')

    req.session.l2auth = 'totp'

    let redirectUrl = '/dashboard'

    if (req.session.redirectUrl) {
      redirectUrl = req.session.redirectUrl
      req.session.redirectUrl = null
    }

    return res.redirect(redirectUrl)
  })(req, res, next)
}

mainController.logout = function (req, res) {
  req.session.l2auth = null
  req.session.destroy(function () {
    req.logout(function () {
      res.clearCookie('connect.sid')
      return res.redirect('/')
    })
  })
}

mainController.forgotL2Auth = async function (req, res) {
  const data = req.body
  if (_.isUndefined(data['forgotl2auth-email'])) {
    return res.status(400).send('No Form Data')
  }

  const email = data['forgotl2auth-email']
  const userSchema = require('../models/user')

  try {
    const user = await userSchema.getUserByEmail(email)

    if (!user) {
      return res.status(400).send('Invalid Email: Account not found!')
    }

    const Chance = require('chance')
    const chance = new Chance()

    user.resetL2AuthHash = chance.hash({ casing: 'upper' })
    const expireDate = new Date()
    expireDate.setDate(expireDate.getDate() + 2)
    user.resetL2AuthExpire = expireDate

    let savedUser = await user.save()

    const mailer = require('../mailer')
    const Email = require('email-templates')
    const templateDir = path.resolve(__dirname, '..', 'mailer', 'templates')

    const emailRenderer = new Email({
      views: {
        root: templateDir,
        options: {
          extension: 'handlebars'
        }
      }
    })

    savedUser = savedUser.toJSON()

    const renderData = {
      base_url: req.protocol + '://' + req.get('host'),
      user: savedUser
    }

    const html = await emailRenderer.render('l2auth-reset', renderData)
    const mailOptions = {
      to: savedUser.email,
      subject: require('../i18n').t('accountRecovery', { siteTitle: 'Trudesk' }),
      html,
      generateTextFromHTML: true
    }

    mailer.sendMail(mailOptions, function (err) {
      if (err) {
        winston.warn(err)
        return res.status(400).send(err)
      }

      return res.send('OK')
    })
  } catch (err) {
    return res.status(400).send(err.message)
  }
}

mainController.forgotPass = async function (req, res) {
  const data = req.body
  if (_.isUndefined(data['forgotPass-email'])) {
    return res.status(400).send('No Form Data')
  }

  const emailAddr = data['forgotPass-email']
  const userSchema = require('../models/user')

  try {
    const user = await userSchema.getUserByEmail(emailAddr)

    if (_.isUndefined(user) || _.isEmpty(user)) {
      req.flash('Invalid Email: Account not found!')
      return res.status(400).send('Invalid Email: Account not found!')
    }

    // Found user send Password Reset Email.
    // Set User Reset Hash and Expire Date.
    const Chance = require('chance')
    const chance = new Chance()

    user.resetPassHash = chance.hash({ casing: 'upper' })
    const expireDate = new Date()
    expireDate.setDate(expireDate.getDate() + 2)
    user.resetPassExpire = expireDate

    let savedUser = await user.save()

    // Send mail
    const mailer = require('../mailer')
    const Email = require('email-templates')
    const templateDir = path.resolve(__dirname, '..', 'mailer', 'templates')
    const templateSchema = require('../models/template')

    let email = null

    savedUser = savedUser.toJSON()

    const renderData = {
      base_url: req.protocol + '://' + req.get('host'),
      user: savedUser
    }

    // Waterfall step 1: check beta email setting
    const settingsSchema = require('../models/setting')
    const setting = await settingsSchema.getSetting('beta:email')
    const betaEnabled = !setting ? false : setting.value

    // Waterfall step 2: check for template if beta enabled
    let template = false
    if (betaEnabled) {
      const dbTemplate = await templateSchema.findOne({ name: 'password-reset' })
      if (dbTemplate) {
        email = new Email({
          render: function (view, locals) {
            return new Promise(function (resolve, reject) {
              if (!global.Handlebars) return reject(new Error('Could not load global.Handlebars'))
              templateSchema.findOne({ name: view }).then(function (tmpl) {
                if (!tmpl) return reject(new Error('Invalid Template'))
                const html = global.Handlebars.compile(tmpl.data['gjs-fullHtml'])(locals)
                email.juiceResources(html).then(resolve)
              }).catch(reject)
            })
          }
        })
        template = dbTemplate
      }
    }

    // Waterfall step 3: fallback to file-based template
    if (!template) {
      email = new Email({
        views: {
          root: templateDir,
          options: {
            extension: 'handlebars'
          }
        }
      })
    }

    const emailT = require('../i18n').t; let subject = emailT('passwordResetRequest', { siteTitle: 'Trudesk' })
    if (template) subject = global.Handlebars.compile(template.subject)(renderData)

    const html = await email.render('password-reset', renderData)
    const mailOptions = {
      to: savedUser.email,
      subject,
      html,
      generateTextFromHTML: true
    }

    mailer.sendMail(mailOptions, function (err) {
      if (err) {
        winston.warn(err)
        return res.status(400).send(err)
      }
      return res.status(200).send()
    })
  } catch (err) {
    req.flash('loginMessage', 'Error: ' + err)
    winston.warn(err)
    return res.status(400).send(err.message)
  }
}

mainController.resetl2auth = async function (req, res) {
  const hash = req.params.hash
  if (_.isUndefined(hash)) {
    return res.status(400).send('Invalid Link!')
  }

  const userSchema = require('../models/user')

  try {
    const user = await userSchema.getUserByL2ResetHash(hash)

    if (_.isUndefined(user) || _.isEmpty(user)) {
      return res.status(400).send('Invalid Link!')
    }

    const now = new Date()
    if (now < user.resetL2AuthExpire) {
      user.tOTPKey = undefined
      user.hasL2Auth = false
      user.resetL2AuthHash = undefined
      user.resetL2AuthExpire = undefined

      let updated = await user.save()

      // Send mail
      const mailer = require('../mailer')
      const Email = require('email-templates')
      const templateDir = path.resolve(__dirname, '..', 'mailer', 'templates')

      const emailRenderer = new Email({
        views: {
          root: templateDir,
          options: {
            extension: 'handlebars'
          }
        }
      })

      updated = updated.toJSON()

      const html = await emailRenderer.render('l2auth-cleared', user)
      const mailOptions = {
        to: updated.email,
        subject: require('../i18n').t('twoFactorRemoved', { siteTitle: 'Trudesk' }),
        html,
        generateTextFromHTML: true
      }

      mailer.sendMail(mailOptions, function (err) {
        if (err) {
          winston.warn(err)
          req.flash('loginMessage', err.message)
          return res.redirect(307, '/')
        }

        req.flash('loginMessage', 'Account Recovery Email Sent.')
        return mainController.logout(req, res)
      })
    } else {
      return res.status(400).send('Invalid Link!')
    }
  } catch (err) {
    return res.status(400).send('Invalid Link!')
  }
}

mainController.resetPass = async function (req, res) {
  const hash = req.params.hash

  if (_.isUndefined(hash)) {
    return res.status(400).send('Invalid Link!')
  }

  const userSchema = require('../models/user')

  try {
    const user = await userSchema.getUserByResetHash(hash)

    if (_.isUndefined(user) || _.isEmpty(user)) {
      return res.status(400).send('Invalid Link!')
    }

    const now = new Date()
    if (now < user.resetPassExpire) {
      const Chance = require('chance')
      const chance = new Chance()
      const gPass = chance.string({ length: 8 })
      user.password = gPass

      user.resetPassHash = undefined
      user.resetPassExpire = undefined

      let updated = await user.save()

      // Send mail
      const mailer = require('../mailer')
      const Email = require('email-templates')
      const templateDir = path.resolve(__dirname, '..', 'mailer', 'templates')

      const emailRenderer = new Email({
        views: {
          root: templateDir,
          options: {
            extension: 'handlebars'
          }
        }
      })

      updated = updated.toJSON()

      const renderData = {
        password: gPass,
        user: updated
      }

      const html = await emailRenderer.render('new-password', renderData)
      const mailOptions = {
        to: updated.email,
        subject: require('../i18n').t('newPassword', { siteTitle: 'Trudesk' }),
        html,
        generateTextFromHTML: true
      }

      mailer.sendMail(mailOptions, function (err) {
        if (err) {
          winston.warn(err)
          req.flash('loginMessage', err.message)
          return res.redirect(307, '/')
        }

        req.flash('loginMessage', 'Password reset successfully')
        return res.redirect(307, '/')
      })
    }
  } catch (err) {
    winston.warn(err)
    return res.status(400).send('Invalid Link!')
  }
}

mainController.l2authget = async function (req, res) {
  if (!req.user || !req.user.hasL2Auth) {
    req.logout(function () {
      return res.redirect('/')
    })
    return
  }

  const content = {}
  content.title = 'Login'
  content.layout = false

  try {
    const settingsFull = await settingsUtil.getSettings()
    const settings = settingsFull.data?.settings

    if (!_.isNull(settings) && !_.isNull(settings.mailerEnabled)) {
      content.mailerEnabled = settings.mailerEnabled.value
    }
    content.pageLogo = '/img/defaultLogoDark.png'
    if (settings.hasCustomPageLogo.value && settings.customPageLogoFilename.value.length > 0) {
      content.pageLogo = '/assets/' + settings.customPageLogoFilename.value
    }

    return res.render('login-otp', content)
  } catch (err) {
    throw new Error(err)
  }
}

mainController.uploadFavicon = function (req, res) {
  const fs = require('fs')
  const settingUtil = require('../settings/settingsUtil')
  const Busboy = require('busboy')
  const busboy = Busboy({
    headers: req.headers,
    limit: {
      file: 1,
      fileSize: 1024 * 1024 * 1
    }
  })

  const object = {}
  let error

  busboy.on('file', function (name, file, info) {
    const filename = info.filename
    const mimetype = info.mimeType

    if (mimetype.indexOf('image/') === -1) {
      error = {
        status: 400,
        message: 'Invalid File Type'
      }

      return file.resume()
    }

    const savePath = path.join(__dirname, '../../public/uploads/assets')
    if (!fs.existsSync(savePath)) fs.mkdirSync(savePath)

    object.filePath = path.join(savePath, 'favicon' + path.extname(filename))
    object.filename = 'favicon' + path.extname(filename)
    object.mimetype = mimetype

    file.on('limit', function () {
      error = {
        stats: 400,
        message: 'File size too large. File size limit: 1mb'
      }

      return file.resume()
    })

    file.pipe(fs.createWriteStream(object.filePath))
  })

  busboy.on('finish', async function () {
    if (error) {
      winston.warn(error)
      return res.status(error.status).send(error.message)
    }

    if (_.isUndefined(object.filePath) || _.isUndefined(object.filename)) {
      return res.status(400).send('Invalid image data')
    }

    if (!fs.existsSync(object.filePath)) return res.status(400).send('File failed to save to disk')
    if (path.extname(object.filename) === '.jpg' || path.extname(object.filename) === '.jpeg') {
      require('../helpers/utils').stripExifData(object.filePath)
    }

    try {
      await settingUtil.setSetting('gen:customfavicon', true)
      await settingUtil.setSetting('gen:customfaviconfilename', object.filename)
      return res.send(object.filename)
    } catch (err) {
      return res.status(400).send('Failed to save setting to database')
    }
  })

  req.pipe(busboy)
}

mainController.uploadLogo = function (req, res) {
  const fs = require('fs')
  const settingUtil = require('../settings/settingsUtil')
  const Busboy = require('busboy')
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      files: 1,
      fileSize: 1024 * 1024 * 3 // 3mb
    }
  })

  const object = {}
  let error

  busboy.on('file', function (name, file, info) {
    const filename = info.filename
    const mimetype = info.mimeType
    if (mimetype.indexOf('image/') === -1) {
      error = {
        status: 400,
        message: 'Invalid File Type'
      }

      return file.resume()
    }

    const savePath = path.join(__dirname, '../../public/uploads/assets')
    if (!fs.existsSync(savePath)) fs.mkdirSync(savePath)

    object.filePath = path.join(savePath, 'topLogo' + path.extname(filename))
    object.filename = 'topLogo' + path.extname(filename)
    object.mimetype = mimetype

    file.on('limit', function () {
      error = {
        stats: 400,
        message: 'File size too large. File size limit: 3mb'
      }

      return file.resume()
    })

    file.pipe(fs.createWriteStream(object.filePath))
  })

  busboy.once('finish', async function () {
    if (error) {
      winston.warn(error)
      return res.status(error.status).send(error.message)
    }

    if (_.isUndefined(object.filePath) || _.isUndefined(object.filename)) {
      return res.status(400).send('Invalid image data')
    }

    if (!fs.existsSync(object.filePath)) return res.status(400).send('File failed to save to disk')
    if (path.extname(object.filename) === '.jpg' || path.extname(object.filename) === '.jpeg') {
      require('../helpers/utils').stripExifData(object.filePath)
    }

    try {
      await settingUtil.setSetting('gen:customlogo', true)
      await settingUtil.setSetting('gen:customlogofilename', object.filename)
      return res.send(object.filename)
    } catch (err) {
      return res.status(400).send('Failed to save setting to database')
    }
  })

  req.pipe(busboy)
}

mainController.uploadPageLogo = function (req, res) {
  const fs = require('fs')
  const settingUtil = require('../settings/settingsUtil')
  const Busboy = require('busboy')
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      files: 1,
      fileSize: 1024 * 1024 * 3 // 3mb
    }
  })

  const object = {}
  let error

  busboy.on('file', function (name, file, info) {
    const filename = info.filename
    const mimetype = info.mimeType

    if (mimetype.indexOf('image/') === -1) {
      error = {
        status: 400,
        message: 'Invalid File Type'
      }

      return file.resume()
    }

    const savePath = path.join(__dirname, '../../public/uploads/assets')
    if (!fs.existsSync(savePath)) fs.mkdirSync(savePath)

    object.filePath = path.join(savePath, 'pageLogo' + path.extname(filename))
    object.filename = 'pageLogo' + path.extname(filename)
    object.mimetype = mimetype

    file.on('limit', function () {
      error = {
        stats: 400,
        message: 'File size too large. File size limit: 3mb'
      }

      return file.resume()
    })

    file.pipe(fs.createWriteStream(object.filePath))
  })

  busboy.once('finish', async function () {
    if (error) {
      winston.warn(error)
      return res.status(error.status).send(error.message)
    }

    if (_.isUndefined(object.filePath) || _.isUndefined(object.filename)) {
      return res.status(400).send('Invalid image data')
    }

    if (!fs.existsSync(object.filePath)) return res.status(400).send('File failed to save to disk')
    if (path.extname(object.filename) === '.jpg' || path.extname(object.filename) === '.jpeg') {
      require('../helpers/utils').stripExifData(object.filePath)
    }

    try {
      await settingUtil.setSetting('gen:custompagelogo', true)
      await settingUtil.setSetting('gen:custompagelogofilename', object.filename)
      return res.send(object.filename)
    } catch (err) {
      return res.status(400).send('Failed to save setting to database')
    }
  })

  req.pipe(busboy)
}

module.exports = mainController
