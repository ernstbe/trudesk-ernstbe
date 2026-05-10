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

'use strict'

const db = require('../database')
const mongoose = require('mongoose')
const winston = require('../logger')
const csrf = require('../dependencies/csrf-td')
const viewdata = require('../helpers/viewdata')

const middleware = {}

middleware.db = function (req, res, next) {
  if (mongoose.connection.readyState !== 1) {
    winston.warn('MongoDB ReadyState = ' + mongoose.connection.readyState)
    db.init(function (e, database) {
      if (e) {
        return res.status(503).send()
      }

      req.db = database
    })
  }

  return next()
}

middleware.redirectToDashboardIfLoggedIn = function (req, res, next) {
  if (req.user) {
    if (req.user.hasL2Auth) {
      return middleware.ensurel2Auth(req, res, next)
    }

    if (!req.user.role.isAdmin || !req.user.role.isAgent) {
      return res.redirect('/tickets')
    }

    return res.redirect('/dashboard')
  }

  return next()
}

middleware.redirectToLogin = function (req, res, next) {
  if (!req.user) {
    if (req.session !== undefined) {
      req.session.redirectUrl = req.url
    }

    return res.redirect('/')
  }

  if (req.user.deleted) {
    req.logout(function () {
      req.session.l2auth = null
      req.session.destroy()
      return res.redirect('/')
    })
    return
  }

  if (req.user.hasL2Auth) {
    if (req.session.l2auth !== 'totp') {
      return res.redirect('/')
    }
  }

  return next()
}

middleware.redirectIfUser = function (req, res, next) {
  if (!req.user) {
    if (req.session !== undefined) {
      res.session.redirectUrl = req.url
    }

    return res.redirect('/')
  }

  if (!req.user.role.isAdmin && !req.user.role.isAgent) {
    return res.redirect(301, '/tickets')
  }

  return next()
}

middleware.ensurel2Auth = function (req, res, next) {
  if (req.session.l2auth === 'totp') {
    if (req.user) {
      // role is a populated Role document with virtuals — string compare against 'user' never matches.
      if (req.user.role && (req.user.role.isAdmin || req.user.role.isAgent)) {
        return res.redirect('/dashboard')
      }

      return res.redirect('/tickets')
    }

    return next()
  }

  return res.redirect('/l2auth')
}

// Common
middleware.loadCommonData = function (req, res, next) {
  let called = false
  function done (data) {
    if (called) return
    called = true
    data.csrfToken = req.csrfToken
    req.viewdata = data
    return next()
  }

  const result = viewdata.getData(req, done)

  // If getData has been converted to async (returns a Promise), handle that too
  if (result && typeof result.then === 'function') {
    result.then(function (data) {
      done(data)
    }).catch(function (err) {
      if (!called) {
        called = true
        winston.warn('Error loading common data: ' + err)
        return next(err)
      }
    })
  }
}

middleware.cache = function (seconds) {
  return function (req, res, next) {
    res.setHeader('Cache-Control', 'public, max-age=' + seconds)

    next()
  }
}

middleware.checkCaptcha = function (req, res, next) {
  const postData = req.body
  if (postData === undefined) {
    return res.status(400).json({ success: false, error: 'Invalid Captcha' })
  }

  const captcha = postData.captcha
  const captchaValue = req.session.captcha

  if (captchaValue === undefined) {
    return res.status(400).json({ success: false, error: 'Invalid Captcha' })
  }

  if (captchaValue.toString() !== captcha.toString()) {
    return res.status(400).json({ success: false, error: 'Invalid Captcha' })
  }

  return next()
}

middleware.checkOrigin = function (req, res, next) {
  let origin = req.headers.origin
  const host = req.headers.host

  // Firefox Hack - Firefox Bug 1341689 & 1424076
  // Trudesk Bug #26
  // TODO: Fix this once Firefox fixes its Origin Header in same-origin POST request.
  if (!origin) {
    origin = host
  }

  origin = origin.replace(/^https?:\/\//, '')

  if (origin !== host) {
    return res.status(400).json({ success: false, error: 'Invalid Origin!' })
  }

  return next()
}

// API
middleware.api = async function (req, res, next) {
  const accessToken = req.headers.accesstoken

  const userSchema = require('../models/user')

  if (accessToken === undefined || accessToken === null) {
    const user = req.user
    if (user === undefined || user === null) return res.status(401).json({ error: 'Invalid Access Token' })

    return next()
  }

  try {
    const user = await userSchema.getUserByAccessToken(accessToken)
    if (!user) return res.status(401).json({ error: 'Invalid Access Token' })

    req.user = user

    return next()
  } catch (err) {
    return res.status(401).json({ error: err.message })
  }
}

middleware.hasAuth = middleware.api

middleware.apiv2 = function (req, res, next) {
  // ByPass auth for now if user is set through session
  if (req.user) return next()

  const passport = require('passport')
  passport.authenticate('jwt', { session: true }, async function (err, user) {
    if (user) {
      req.user = user
      return next()
    }

    // Fallback: accept v1 accesstoken header so the PWA can call v2
    // endpoints without a separate JWT login. v1 tokens are simple
    // hashes stored in the DB — not as secure as JWTs but perfectly
    // fine for a single-org deployment.
    const accessToken = req.headers.accesstoken
    if (accessToken) {
      try {
        const userSchema = require('../models/user')
        const tokenUser = await userSchema.getUserByAccessToken(accessToken)
        if (tokenUser && !tokenUser.deleted) {
          req.user = tokenUser
          return next()
        }
      } catch (tokenErr) {
        // fall through to 401
      }
    }

    return res.status(401).json({ success: false, error: 'Invalid Authentication Token' })
  })(req, res, next)
}

middleware.canUser = function (action) {
  return function (req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, error: 'Not Authorized for this API call.' })
    const permissions = require('../permissions')
    const perm = permissions.canThis(req.user.role, action)
    if (perm) return next()

    return res.status(401).json({ success: false, error: 'Not Authorized for this API call.' })
  }
}

middleware.isAdmin = function (req, res, next) {
  const roles = global.roles
  const role = roles.find(r => r._id.toString() === req.user.role._id.toString())
  role.isAdmin = role.grants.indexOf('admin:*') !== -1

  if (role.isAdmin) return next()

  return res.status(401).json({ success: false, error: 'Not Authorized for this API call.' })
}

middleware.isAgentOrAdmin = function (req, res, next) {
  const role = global.roles.find(r => r._id.toString() === req.user.role._id.toString())
  role.isAdmin = role.grants.indexOf('admin:*') !== -1
  role.isAgent = role.grants.indexOf('agent:*') !== -1

  if (role.isAgent || role.isAdmin) return next()

  return res.status(401).json({ success: false, error: 'Not Authorized for this API call.' })
}

middleware.isAgent = function (req, res, next) {
  const role = global.roles.find(r => r._id.toString() === req.user.role._id.toString())
  role.isAgent = role.grants.indexOf('agent:*') !== -1

  if (role.isAgent) return next()

  return res.status(401).json({ success: false, error: 'Not Authorized for this API call.' })
}

middleware.isSupport = middleware.isAgent

middleware.csrfCheck = function (req, res, next) {
  csrf.init()
  return csrf.middleware(req, res, next)
}

module.exports = function () {
  return middleware
}
