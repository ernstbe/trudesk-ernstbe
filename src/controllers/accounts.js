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
const userSchema = require('../models/user')
const permissions = require('../permissions')
const emitter = require('../emitter')
const xss = require('xss')

const accountsController = {}

accountsController.content = {}

function handleError (res, err) {
  if (err) {
    return res.render('error', {
      layout: false,
      error: err,
      message: err.message
    })
  }
}

accountsController.signup = async function (req, res) {
  const marked = require('marked')
  const settings = require('../models/setting')

  try {
    const setting = await settings.getSettingByName('allowUserRegistration:enable')
    if (setting && setting.value === true) {
      const privacyPolicy = await settings.getSettingByName('legal:privacypolicy')

      const content = {}
      content.title = 'Konto erstellen'
      content.layout = false
      content.data = {}

      if (privacyPolicy === null || privacyPolicy.value === undefined) {
        content.data.privacyPolicy = 'No Privacy Policy has been set.'
      } else {
        content.data.privacyPolicy = xss(marked.parse(privacyPolicy.value))
      }

      return res.render('pub_signup', content)
    } else {
      return res.redirect('/')
    }
  } catch (err) {
    return handleError(res, err)
  }
}

accountsController.get = function (req, res) {
  const user = req.user
  if (user === undefined || !permissions.canThis(user.role, 'accounts:view')) {
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Benutzer'
  content.nav = 'accounts'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata

  return res.render('accounts', content)
}

accountsController.getCustomers = function (req, res) {
  const user = req.user
  if (user === undefined || !permissions.canThis(user.role, 'accounts:view')) {
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Helfer'
  content.nav = 'accounts'
  content.subnav = 'accounts-customers'

  content.data = {}
  content.data.user = user
  content.data.common = req.viewdata
  content.data.view = 'customers'

  return res.render('accounts', content)
}

accountsController.getAgents = function (req, res) {
  const user = req.user
  if (user === undefined || !permissions.canThis(user.role, 'accounts:view')) {
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Bearbeiter'
  content.nav = 'accounts'
  content.subnav = 'accounts-agents'

  content.data = {}
  content.data.user = user
  content.data.common = req.viewdata
  content.data.view = 'agents'

  return res.render('accounts', content)
}

accountsController.getAdmins = function (req, res) {
  const user = req.user
  if (user === undefined || !permissions.canThis(user.role, 'accounts:view')) {
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Administratoren'
  content.nav = 'accounts'
  content.subnav = 'accounts-admins'

  content.data = {}
  content.data.user = user
  content.data.common = req.viewdata
  content.data.view = 'admins'

  return res.render('accounts', content)
}

accountsController.importPage = function (req, res) {
  const user = req.user
  if (user === undefined || !permissions.canThis(user.role, 'accounts:import')) {
    return res.redirect('/')
  }

  const content = {}
  content.title = 'Benutzer - Import'
  content.nav = 'accounts'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata

  res.render('accounts_import', content)
}

accountsController.profile = async function (req, res) {
  const user = req.user
  const backUrl = req.header('Referer') || '/'
  if (user === undefined) {
    req.flash('message', 'Permission Denied.')
    winston.warn('Undefined User - /Profile')
    return res.redirect(backUrl)
  }

  const content = {}
  content.title = 'Profil'
  content.nav = 'profile'

  content.data = {}
  content.data.user = req.user
  content.data.common = req.viewdata
  content.data.host = req.hostname
  content.data.account = {}

  try {
    const account = await userSchema.findOne({ _id: req.user._id }, '+accessToken +tOTPKey')
    content.data.account = account
    res.render('subviews/profile', content)
  } catch (err) {
    winston.warn(err)
    return res.redirect(backUrl)
  }
}

accountsController.bindLdap = function (req, res) {
  const ldap = require('../ldap')
  const postData = req.body
  if (postData === undefined) return res.status(400).json({ success: false, error: 'Invalid Post Data.' })

  const server = postData['ldap-server']
  const dn = postData['ldap-bind-dn']
  const password = postData['ldap-password']
  const searchBase = postData['ldap-search-base']
  const filter = postData['ldap-filter']

  ldap.bind('ldap://' + server, dn, password, function (err) {
    if (err && !res.headersSent) return res.status(400).json({ success: false, error: err })

    ldap.search(searchBase, filter, function (err, results) {
      if (err && !res.headersSent) return res.status(400).json({ success: false, error: err })
      if (results === undefined) return res.status(400).json({ success: false, error: 'Undefined Results' })

      const entries = results.entries
      let foundUsers = null
      ldap.unbind(function (err) {
        if (err && !res.headersSent) return res.status(400).json({ success: false, error: err })

        let mappedUsernames = entries.map(e => e.sAMAccountName)

        userSchema.find({ username: mappedUsernames }).then(function (users) {
          foundUsers = users

          mappedUsernames = foundUsers.map(u => u.username)

          mappedUsernames.forEach(function (mappedUsername) {
            const u = entries.find(function (f) {
              return f.sAMAccountName.toLowerCase() === mappedUsername.toLowerCase()
            })

            if (u) {
              // Mutate the entry in foundUsers in place. The previous code did
              // `clonedUser = { ...clonedUser }` which only rebound a local
              // variable — the array entry was never updated, so AD changes
              // (renames, email updates) silently never reached the import step.
              const idx = foundUsers.findIndex(function (g) {
                return g.username.toLowerCase() === u.sAMAccountName.toLowerCase()
              })
              if (idx !== -1) {
                const existing = foundUsers[idx]
                const base = typeof existing.toObject === 'function' ? existing.toObject() : existing
                foundUsers[idx] = {
                  ...base,
                  fullname: u.displayName,
                  email: u.mail,
                  title: u.title
                }
              }
            }

            entries = entries.filter(function (k) {
              return k.sAMAccountName.toLowerCase() !== mappedUsername.toLowerCase()
            })
          })

          entries = entries.filter(function (e) {
            return e.mail !== undefined
          })

          return res.json({
            success: true,
            addedUsers: entries,
            updatedUsers: foundUsers
          })
        }).catch(function (err) {
          if (!res.headersSent) return res.status(400).json({ success: false, error: err })
        })
      })
    })
  })
}

async function processUsers (addedUserArray, updatedUserArray, item) {
  const user = await userSchema.getUserByUsername(item.username)

  if (user) {
    updatedUserArray.push(item)
  } else {
    addedUserArray.push(item)
  }
}

accountsController.uploadCSV = function (req, res) {
  const csv = require('fast-csv')
  const Busboy = require('busboy')
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      files: 1
    }
  })

  const object = {}

  const parser = csv.parse()

  busboy.on('file', function (name, file, info) {
    object.csv = []

    file
      .on('readable', function () {
        let data
        while ((data = file.read()) !== null) {
          parser.write(data)
        }
      })
      .on('end', function () {
        parser.end()
      })
  })

  busboy.on('error', function (err) {
    res.status(400).json({ success: false, error: err })
  })

  parser
    .on('data', function (row) {
      object.csv.push(row)
    })
    .on('end', async function () {
      if (object.csv.length < 1) {
        return res.json({ success: false, error: 'Invalid CSV. No title Row.' })
      }

      const titleRow = object.csv[0]
      const usernameIdx = titleRow.findIndex(function (i) {
        return i.toLowerCase() === 'username'
      })
      const fullnameIdx = titleRow.findIndex(function (i) {
        return i.toLowerCase() === 'name'
      })
      const emailIdx = titleRow.findIndex(function (i) {
        return i.toLowerCase() === 'email'
      })
      const titleIdx = titleRow.findIndex(function (i) {
        return i.toLowerCase() === 'title'
      })
      const roleIdx = titleRow.findIndex(function (i) {
        return i.toLowerCase() === 'role'
      })

      object.csv.splice(0, 1)

      // Left with just the data for the import; Lets map that to an array of usable objects.
      object.csv = object.csv.map(function (item) {
        return Object.assign(
          { username: item[usernameIdx] },
          { fullname: item[fullnameIdx] },
          { email: item[emailIdx] },
          { title: item[titleIdx] },
          { role: item[roleIdx] }
        )
      })

      const addedUsers = []
      const updatedUsers = []

      try {
        await Promise.all(object.csv.map(async (item) => {
          return processUsers(addedUsers, updatedUsers, item)
        }))

        return res.json({
          success: true,
          contents: object.csv,
          addedUsers,
          updatedUsers
        })
      } catch (err) {
        winston.warn(err.message)
        return res.json({ success: false, error: err })
      }
    })

  req.pipe(busboy)
}

accountsController.uploadJSON = function (req, res) {
  const Busboy = require('busboy')
  const busboy = new Busboy({
    headers: req.headers,
    limits: {
      files: 1
    }
  })

  const addedUsers = []

  const updatedUsers = []

  const object = {}
  let error
  busboy.on('file', function (fieldname, file, filename, encoding, mimetype) {
    if (mimetype.indexOf('application/json') === -1) {
      error = {
        status: 400,
        message: 'Invalid File Type'
      }

      return file.resume()
    }
    let buffer = ''
    file.on('data', function (data) {
      buffer += data
    })

    file
      .on('end', async function () {
        object.json = JSON.parse(buffer)
        const accounts = object.json.accounts
        if (accounts === undefined) {
          return res.status(400).json({
            success: false,
            error: 'No accounts defined in JSON file.'
          })
        }

        try {
          for (const item of accounts) {
            await processUsers(addedUsers, updatedUsers, item)
          }

          return res.json({
            success: true,
            contents: object.json,
            addedUsers,
            updatedUsers
          })
        } catch (err) {
          return res.status(400).json({ success: false, error: err })
        }
      })
      .setEncoding('utf8')
  })

  busboy.on('error', function (err) {
    return res.status(400).json({ success: false, error: err })
  })

  busboy.on('finish', function () {
    if (error) {
      return res.status(error.status || 500).json({ success: false, error })
    }
  })

  req.pipe(busboy)
}

accountsController.uploadImage = function (req, res) {
  const fs = require('fs')
  const path = require('path')
  const Busboy = require('busboy')
  const busboy = Busboy({
    headers: req.headers,
    limits: {
      files: 1,
      fileSize: 1024 * 1024 * 3 // 3mb limit
    }
  })

  const allowedExts = ['.png', '.jpg', '.jpeg', '.gif']

  const object = {}
  let error

  busboy.on('field', function (fieldname, val) {
    if (fieldname === '_id') object._id = val
    if (fieldname === 'username') object.username = val
  })

  busboy.on('file', function (name, file, info) {
    const filename = info.filename
    const mimetype = info.mimeType
    const ext = path.extname(filename)

    if (!allowedExts.includes(ext)) {
      error = {
        status: 400,
        message: 'Invalid File Type'
      }

      return file.resume()
    }

    const savePath = path.join(__dirname, '../../public/uploads/users')
    if (!fs.existsSync(savePath)) fs.mkdirSync(savePath)

    object.filename = 'aProfile_' + object.username + path.extname(filename)
    object.filename = object.filename.replace('/', '').replace('..', '')
    object.filePath = path.join(savePath, object.filename)
    object.mimetype = mimetype

    file.on('limit', function () {
      error = {
        status: 400,
        message: 'File too large'
      }

      return file.resume()
    })

    file.pipe(fs.createWriteStream(object.filePath))
  })

  busboy.once('finish', async function () {
    if (error) {
      winston.warn(error)
      return res.status(error.status || 500).send(error.message)
    }

    if (
      object._id === undefined ||
      object.username === undefined ||
      object.filePath === undefined ||
      object.filename === undefined
    ) {
      return res.status(400).send('Invalid Form Data')
    }

    // Everything Checks out lets make sure the file exists and then add it to the attachments array
    if (!fs.existsSync(object.filePath)) return res.status(400).send('File Failed to Save to Disk')
    if (path.extname(object.filename) === '.jpg' || path.extname(object.filename) === '.jpeg') {
      require('../helpers/utils').stripExifData(object.filePath)
    }

    try {
      const user = await userSchema.getUser(object._id)
      user.image = object.filename
      await user.save()

      emitter.emit('trudesk:profileImageUpdate', {
        userid: user._id,
        img: user.image
      })

      return res.status(200).send('/uploads/users/' + object.filename)
    } catch (err) {
      return handleError(res, err)
    }
  })

  req.pipe(busboy)
}

module.exports = accountsController
