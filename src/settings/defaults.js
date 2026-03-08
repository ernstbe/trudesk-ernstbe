/*
      .                              .o8                     oooo
   .o8                             "888                     `888
 .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
   888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
   888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
   888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
   "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 ========================================================================
 Created:    02/24/18
 Author:     Chris Brame

 **/

const _ = require('lodash')
const fs = require('fs-extra')
const path = require('path')
const winston = require('../logger')
const moment = require('moment-timezone')

const SettingsSchema = require('../models/setting')
const PrioritySchema = require('../models/ticketpriority')

const settingsDefaults = {}
const roleDefaults = {}

roleDefaults.userGrants = ['tickets:create view update', 'comments:create view update']
roleDefaults.supportGrants = [
  'tickets:*',
  'agent:*',
  'accounts:create update view import',
  'teams:create update view',
  'comments:create view update create delete',
  'reports:view create',
  'notices:*'
]
roleDefaults.adminGrants = [
  'admin:*',
  'agent:*',
  'chat:*',
  'tickets:*',
  'accounts:*',
  'groups:*',
  'teams:*',
  'departments:*',
  'comments:*',
  'reports:*',
  'notices:*',
  'settings:*',
  'api:*'
]

settingsDefaults.roleDefaults = roleDefaults

async function rolesDefault () {
  const roleSchema = require('../models/role')

  // Step 1: Create User role if not exists
  let role = await roleSchema.getRoleByName('User')
  if (!role) {
    const userRole = await roleSchema.create({
      name: 'User',
      description: 'Default role for users',
      grants: roleDefaults.userGrants
    })
    const roleUserDefault = await SettingsSchema.getSetting('role:user:default')
    if (!roleUserDefault) {
      await SettingsSchema.create({
        name: 'role:user:default',
        value: userRole._id
      })
    }
  }

  // Step 2: Create Support role if not exists
  role = await roleSchema.getRoleByName('Support')
  if (!role) {
    await roleSchema.create({
      name: 'Support',
      description: 'Default role for agents',
      grants: roleDefaults.supportGrants
    })
  }

  // Step 3: Create Admin role if not exists
  role = await roleSchema.getRoleByName('Admin')
  if (!role) {
    await roleSchema.create({
      name: 'Admin',
      description: 'Default role for admins',
      grants: roleDefaults.adminGrants
    })
  }

  // Step 4: Create role order if not exists
  const roleOrderSchema = require('../models/roleorder')
  const roleOrder = await roleOrderSchema.getOrder()
  if (!roleOrder) {
    const roles = await roleSchema.getRoles()
    const order = []
    order.push(_.find(roles, { name: 'Admin' })._id)
    order.push(_.find(roles, { name: 'Support' })._id)
    order.push(_.find(roles, { name: 'User' })._id)

    await roleOrderSchema.create({
      order
    })
  }
}

async function defaultUserRole () {
  const roleOrderSchema = require('../models/roleorder')
  const roleOrder = await roleOrderSchema.getOrderLean()
  if (!roleOrder) return

  const roleDefault = await SettingsSchema.getSetting('role:user:default')
  if (roleDefault) return

  const lastId = _.last(roleOrder.order)
  await SettingsSchema.create({
    name: 'role:user:default',
    value: lastId
  })
}

async function createDirectories () {
  await Promise.all([
    fs.ensureDir(path.join(__dirname, '../../backups')),
    fs.ensureDir(path.join(__dirname, '../../restores'))
  ])
}

function downloadWin32MongoDBTools (callback) {
  const http = require('http')
  const os = require('os')
  const semver = require('semver')
  const dbVersion = require('../database').db.version || '5.0.6'
  const fileVersion = semver.major(dbVersion) + '.' + semver.minor(dbVersion)

  if (os.platform() === 'win32') {
    winston.debug('MongoDB version ' + fileVersion + ' detected.')
    const filename = 'mongodb-tools.' + fileVersion + '-win32x64.zip'
    const savePath = path.join(__dirname, '../backup/bin/win32/')
    fs.ensureDirSync(savePath)
    if (
      !fs.existsSync(path.join(savePath, 'mongodump.exe')) ||
      !fs.existsSync(path.join(savePath, 'mongorestore.exe'))
    ) {
      winston.debug('Windows platform detected. Downloading MongoDB Tools [' + filename + ']')
      fs.emptyDirSync(savePath)
      const unzipper = require('unzipper')
      const file = fs.createWriteStream(path.join(savePath, filename))
      let callbackFired = false
      const safeCallback = function (err) {
        if (callbackFired) return
        callbackFired = true
        callback(err)
      }
      const req = http
        .get('http://storage.trudesk.io/tools/' + filename, function (response) {
          if (response.statusCode !== 200) {
            req.destroy()
            file.close()
            fs.unlink(path.join(savePath, filename), function () {})
            winston.warn('MongoDB Tools download returned HTTP ' + response.statusCode + ', skipping.')
            return safeCallback()
          }
          response.pipe(file)
          file.on('finish', function () {
            file.close()
          })
          file.on('close', function () {
            fs.createReadStream(path.join(savePath, filename))
              .pipe(unzipper.Extract({ path: savePath }))
              .on('close', function () {
                fs.unlink(path.join(savePath, filename), safeCallback)
              })
          })
        })
        .on('error', function (err) {
          fs.unlink(path.join(savePath, filename), function () {})
          winston.debug(err)
          return safeCallback()
        })
      req.setTimeout(10000, function () {
        req.destroy()
        file.close()
        fs.unlink(path.join(savePath, filename), function () {})
        winston.warn('MongoDB Tools download timed out, skipping.')
        return safeCallback()
      })
    } else {
      return callback()
    }
  } else {
    return callback()
  }
}

async function timezoneDefault () {
  const setting = await SettingsSchema.getSettingByName('gen:timezone')

  if (!setting) {
    const defaultTimezone = new SettingsSchema({
      name: 'gen:timezone',
      value: 'America/New_York'
    })

    const saved = await defaultTimezone.save()
    winston.debug('Timezone set to ' + saved.value)
    moment.tz.setDefault(saved.value)
    global.timezone = saved.value
  } else {
    winston.debug('Timezone set to ' + setting.value)
    moment.tz.setDefault(setting.value)
    global.timezone = setting.value
  }
}

// eslint-disable-next-line no-unused-vars
async function _showTourSettingDefault () {
  const setting = await SettingsSchema.getSettingByName('showTour:enable')

  if (!setting) {
    const defaultShowTour = new SettingsSchema({
      name: 'showTour:enable',
      value: 0
    })

    await defaultShowTour.save()
  }
}

async function ticketTypeSettingDefault () {
  const setting = await SettingsSchema.getSettingByName('ticket:type:default')

  if (!setting) {
    const ticketTypeSchema = require('../models/tickettype')
    const types = await ticketTypeSchema.getTypes()

    const type = _.first(types)
    if (!type) throw new Error('No Types Defined!')
    if (!_.isObject(type) || _.isUndefined(type._id)) throw new Error('Invalid Type. Skipping.')

    // Save default ticket type
    const defaultTicketType = new SettingsSchema({
      name: 'ticket:type:default',
      value: type._id
    })

    await defaultTicketType.save()
  }
}

/**
 * Sets default status of tickets during creation.
 */
async function ticketStatusSettingDefault () {
  const statusSettingName = 'ticket:status:default'
  const setting = await SettingsSchema.getSettingByName(statusSettingName)

  if (setting) return

  const ticketStatusSchema = require('../models/ticketStatus')
  const statuses = await ticketStatusSchema.getStatus()

  const status = _.first(statuses)
  if (!status) {
    throw new Error('No Statuses Defined!')
  }

  if (!_.isObject(status) || _.isUndefined(status._id)) {
    throw new Error('Invalid Status. Skipping.')
  }

  const defaultTicketStatus = new SettingsSchema({
    name: statusSettingName,
    value: status._id
  })

  await defaultTicketStatus.save()
}

async function ticketPriorityDefaults () {
  const priorities = []

  const normal = new PrioritySchema({
    name: 'Normal',
    migrationNum: 1,
    default: true
  })

  const urgent = new PrioritySchema({
    name: 'Urgent',
    migrationNum: 2,
    htmlColor: '#8e24aa',
    default: true
  })

  const critical = new PrioritySchema({
    name: 'Critical',
    migrationNum: 3,
    htmlColor: '#e65100',
    default: true
  })

  priorities.push(normal)
  priorities.push(urgent)
  priorities.push(critical)

  await Promise.all(priorities.map(async function (item) {
    const priority = await PrioritySchema.findOne({ migrationNum: item.migrationNum })
    if (!priority) {
      await item.save()
    }
  }))
}

async function normalizeTags () {
  const tagSchema = require('../models/tag')
  const tags = await tagSchema.find({})
  await Promise.all(tags.map(async function (tag) {
    await tag.save()
  }))
}

async function checkPriorities () {
  const ticketSchema = require('../models/ticket')

  const [countP1, countP2, countP3] = await Promise.all([
    ticketSchema.collection.countDocuments({ priority: 1 }),
    ticketSchema.collection.countDocuments({ priority: 2 }),
    ticketSchema.collection.countDocuments({ priority: 3 })
  ])

  const migrateP1 = countP1 > 0
  const migrateP2 = countP2 > 0
  const migrateP3 = countP3 > 0

  const migrations = []

  if (migrateP1) {
    migrations.push((async function () {
      try {
        const normal = await PrioritySchema.getByMigrationNum(1)
        winston.debug('Converting Priority: Normal')
        const res = await ticketSchema.collection.updateMany({ priority: 1 }, { $set: { priority: normal._id } })
        if (res && res.result && res.result.ok !== 1) {
          winston.warn(res.message)
        }
      } catch (err) {
        winston.warn(err.message)
      }
    })())
  }

  if (migrateP2) {
    migrations.push((async function () {
      try {
        const urgent = await PrioritySchema.getByMigrationNum(2)
        winston.debug('Converting Priority: Urgent')
        const res = await ticketSchema.collection.updateMany({ priority: 2 }, { $set: { priority: urgent._id } })
        if (res && res.result && res.result.ok !== 1) {
          winston.warn(res.message)
        }
      } catch (err) {
        winston.warn(err.message)
      }
    })())
  }

  if (migrateP3) {
    migrations.push((async function () {
      try {
        const critical = await PrioritySchema.getByMigrationNum(3)
        winston.debug('Converting Priority: Critical')
        const res = await ticketSchema.collection.updateMany({ priority: 3 }, { $set: { priority: critical._id } })
        if (res && res.result && res.result.ok !== 1) {
          winston.warn(res.message)
        }
      } catch (err) {
        winston.warn(err.message)
      }
    })())
  }

  await Promise.all(migrations)
}

async function addedDefaultPrioritiesToTicketTypes () {
  let priorities = await PrioritySchema.find({ default: true })
  priorities = _.sortBy(priorities, 'migrationNum')

  const ticketTypeSchema = require('../models/tickettype')
  const types = await ticketTypeSchema.getTypes()

  await Promise.all(types.map(async function (type) {
    let prioritiesToAdd = []
    if (!type.priorities || type.priorities.length < 1) {
      type.priorities = []
      prioritiesToAdd = _.map(priorities, '_id')
    }

    if (prioritiesToAdd.length < 1) {
      return
    }

    type.priorities = _.concat(type.priorities, prioritiesToAdd)
    await type.save()
  }))
}

async function mailTemplates () {
  const newTicket = require('./json/mailer-new-ticket')
  const passwordReset = require('./json/mailer-password-reset')
  const templateSchema = require('../models/template')

  const [existingNewTicket, existingPasswordReset] = await Promise.all([
    templateSchema.findOne({ name: newTicket.name }),
    templateSchema.findOne({ name: passwordReset.name })
  ])

  const creates = []
  if (!existingNewTicket) {
    creates.push(templateSchema.create(newTicket))
  }
  if (!existingPasswordReset) {
    creates.push(templateSchema.create(passwordReset))
  }
  if (creates.length > 0) {
    await Promise.all(creates)
  }
}

async function elasticSearchConfToDB () {
  const nconf = require('nconf')
  const elasticsearch = {
    enable: nconf.get('elasticsearch:enable') || false,
    host: nconf.get('elasticsearch:host') || '',
    port: nconf.get('elasticsearch:port') || 9200
  }

  nconf.set('elasticsearch', {})

  await new Promise(function (resolve, reject) {
    let resolved = false
    nconf.save(function (err) {
      if (resolved) return
      resolved = true
      if (err) return reject(err)
      resolve()
    })
    // Safety: if nconf has no file store, the callback may never fire
    setTimeout(function () {
      if (!resolved) {
        resolved = true
        resolve()
      }
    }, 3000)
  })

  const [esEnableSetting, esHostSetting, esPortSetting] = await Promise.all([
    SettingsSchema.getSettingByName('es:enable'),
    SettingsSchema.getSettingByName('es:host'),
    SettingsSchema.getSettingByName('es:port')
  ])

  const creates = []

  if (!esEnableSetting) {
    creates.push(SettingsSchema.create({
      name: 'es:enable',
      value: elasticsearch.enable
    }))
  }

  if (!esHostSetting) {
    if (!elasticsearch.host) elasticsearch.host = 'localhost'
    creates.push(SettingsSchema.create({
      name: 'es:host',
      value: elasticsearch.host
    }))
  }

  if (!esPortSetting && elasticsearch.port) {
    creates.push(SettingsSchema.create({
      name: 'es:port',
      value: elasticsearch.port
    }))
  }

  if (creates.length > 0) {
    await Promise.all(creates)
  }
}

async function installationID () {
  const Chance = require('chance')
  const chance = new Chance()
  const setting = await SettingsSchema.getSettingByName('gen:installid')
  if (!setting) {
    await SettingsSchema.create({
      name: 'gen:installid',
      value: chance.guid()
    })
  }
}

async function maintenanceModeDefault () {
  const setting = await SettingsSchema.getSettingByName('maintenanceMode:enable')
  if (!setting) {
    await SettingsSchema.create({
      name: 'maintenanceMode:enable',
      value: false
    })
  }
}

settingsDefaults.init = async function (callback) {
  winston.debug('Checking Default Settings...')
  try {
    await createDirectories()
    await new Promise(function (resolve, reject) {
      downloadWin32MongoDBTools(function (err) {
        if (err) return reject(err)
        resolve()
      })
    })
    await rolesDefault()
    await defaultUserRole()
    await timezoneDefault()
    await ticketTypeSettingDefault()
    await ticketPriorityDefaults()
    await ticketStatusSettingDefault()
    await addedDefaultPrioritiesToTicketTypes()
    await checkPriorities()
    await normalizeTags()
    await mailTemplates()
    await elasticSearchConfToDB()
    await maintenanceModeDefault()
    await installationID()
  } catch (err) {
    winston.warn(err)
  }
  if (_.isFunction(callback)) return callback()
}

module.exports = settingsDefaults
