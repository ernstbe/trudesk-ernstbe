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

const path = require('path')
const _ = require('lodash')
const winston = require('../logger')
const pkg = require('../../package')
const Chance = require('chance')
const Status = require('../models/ticketStatus')
const counterSchema = require('../models/counters')

const installController = {}
installController.content = {}

installController.index = function (req, res) {
  const content = {}
  content.title = 'Install Trudesk'
  content.layout = false

  content.bottom = 'Trudesk v' + pkg.version
  content.isDocker = process.env.TRUDESK_DOCKER || false

  res.render('install', content)
}

installController.elastictest = function (req, res) {
  const data = req.body
  const CONNECTION_URI = data.host + ':' + data.port

  const child = require('child_process').fork(path.join(__dirname, '../../src/install/elasticsearchtest'), {
    env: { FORK: 1, NODE_ENV: global.env, ELASTICSEARCH_URI: CONNECTION_URI }
  })
  global.forks.push({ name: 'elastictest', fork: child })

  child.on('message', function (data) {
    if (data.error) return res.status(400).json({ success: false, error: data.error })
    return res.json({ success: true })
  })

  child.on('close', function () {
    winston.debug('ElasticSearchTest process terminated.')
  })
}

installController.mongotest = function (req, res) {
  const data = req.body
  const dbPassword = encodeURIComponent(data.password)
  let CONNECTION_URI =
    'mongodb://' + data.username + ':' + dbPassword + '@' + data.host + ':' + data.port + '/' + data.database

  if (data.port === '---')
    CONNECTION_URI = 'mongodb+srv://' + data.username + ':' + dbPassword + '@' + data.host + '/' + data.database

  const child = require('child_process').fork(path.join(__dirname, '../../src/install/mongotest'), {
    env: { FORK: 1, NODE_ENV: global.env, MONGOTESTURI: CONNECTION_URI }
  })

  global.forks.push({ name: 'mongotest', fork: child })
  child.on('message', function (data) {
    if (data.error) return res.status(400).json({ success: false, error: data.error })

    return res.json({ success: true })
  })

  child.on('close', function () {
    global.forks = _.without(global.forks, { name: 'mongotest' })
    winston.debug('MongoTest process terminated')
  })
}

installController.existingdb = function (req, res) {
  const data = req.body

  // Mongo
  const host = data.host
  const port = data.port
  const database = data.database
  const username = data.username
  const password = data.password

  // Write Configfile
  const fs = require('fs')
  const chance = new Chance()
  const configFile = path.join(__dirname, '../../config.yml')
  const YAML = require('yaml')
  const conf = {
    mongo: {
      host: host,
      port: port,
      username: username,
      password: password,
      database: database
    },
    tokens: {
      secret: chance.hash() + chance.md5(),
      expires: 900 // 15min
    }
  }

  fs.writeFile(configFile, YAML.stringify(conf), function (err) {
    if (err) {
      winston.error('FS Error: ' + err.message)
      return res.status(400).json({ success: false, error: err.message })
    }

    return res.json({ success: true })
  })
}

installController.install = async function (req, res) {
  const db = require('../database')
  const roleSchema = require('../models/role')
  const roleOrderSchema = require('../models/roleorder')
  const UserSchema = require('../models/user')
  const GroupSchema = require('../models/group')
  const Counters = require('../models/counters')
  const TicketTypeSchema = require('../models/tickettype')
  const TicketStatusSchema = require('../models/ticketStatus')
  const SettingsSchema = require('../models/setting')

  const data = req.body

  // Mongo
  const host = data['mongo[host]']
  const port = data['mongo[port]']
  const database = data['mongo[database]']
  const username = data['mongo[username]']
  const password = data['mongo[password]']

  // ElasticSearch
  let eEnabled = data['elastic[enable]']
  if (typeof eEnabled === 'string') eEnabled = eEnabled.toLowerCase() === 'true'

  const eHost = data['elastic[host]']
  const ePort = data['elastic[port]']

  // Account
  const user = {
    username: data['account[username]'],
    password: data['account[password]'],
    passconfirm: data['account[cpassword]'],
    email: data['account[email]'],
    fullname: data['account[fullname]']
  }

  const dbPassword = encodeURIComponent(password)
  let conuri = 'mongodb://' + username + ':' + dbPassword + '@' + host + ':' + port + '/' + database
  if (port === '---') conuri = 'mongodb+srv://' + username + ':' + dbPassword + '@' + host + '/' + database

  try {
    // Step 1: Init DB
    await new Promise((resolve, reject) => {
      db.init(function (err) {
        if (err) return reject(err)
        return resolve()
      }, conuri)
    })

    // Step 2: Save version setting
    const s = new SettingsSchema({
      name: 'gen:version',
      value: require('../../package.json').version
    })
    await s.save()

    // Step 3: Save ElasticSearch settings
    await Promise.all([
      SettingsSchema.create({
        name: 'es:enable',
        value: typeof eEnabled === 'undefined' ? false : eEnabled
      }),
      eHost ? SettingsSchema.create({ name: 'es:host', value: eHost }) : Promise.resolve(),
      ePort ? SettingsSchema.create({ name: 'es:port', value: ePort }) : Promise.resolve()
    ])

    // Step 4: Create ticket counter
    const ticketCounter = new Counters({
      _id: 'tickets',
      next: 1001
    })
    await ticketCounter.save()

    // Step 5: Create report counter
    const reportCounter = new Counters({
      _id: 'reports',
      next: 1001
    })
    await reportCounter.save()

    // Step 6: Create ticket statuses
    await TicketStatusSchema.create([
      {
        name: 'New',
        htmlColor: '#29b955',
        uid: 0,
        order: 0,
        isResolved: false,
        slatimer: true,
        isLocked: true
      },
      {
        name: 'Open',
        htmlColor: '#d32f2f',
        uid: 1,
        order: 1,
        isResolved: false,
        slatimer: true,
        isLocked: true
      },
      {
        name: 'Pending',
        htmlColor: '#2196F3',
        uid: 2,
        order: 2,
        isResolved: false,
        slatimer: false,
        isLocked: true
      },
      {
        name: 'Closed',
        htmlColor: '#CCCCCC',
        uid: 3,
        order: 3,
        isResolved: true,
        slatimer: false,
        isLocked: true
      }
    ])

    // Step 7: Set status counter
    await Counters.setCounter('status', 4)

    // Step 8: Create ticket types
    const issueType = new TicketTypeSchema({ name: 'Issue' })
    await issueType.save()

    const taskType = new TicketTypeSchema({ name: 'Task' })
    await taskType.save()

    // Step 9: Create default group
    await GroupSchema.create({ name: 'Default Group' })

    // Step 10: Create roles
    const defaults = require('../settings/defaults')
    const [adminRole, supportRole, userRole] = await Promise.all([
      roleSchema.create({
        name: 'Admin',
        description: 'Default role for admins',
        grants: defaults.roleDefaults.adminGrants
      }),
      roleSchema.create({
        name: 'Support',
        description: 'Default role for agents',
        grants: defaults.roleDefaults.supportGrants
      }),
      roleSchema.create({
        name: 'User',
        description: 'Default role for users',
        grants: defaults.roleDefaults.userGrants
      })
    ])

    // Step 11: Create default team
    const TeamSchema = require('../models/team')
    const defaultTeam = await TeamSchema.create({
      name: 'Support (Default)',
      members: []
    })

    // Step 12: Create admin user
    const admin = await UserSchema.getUserByUsername(user.username)

    if (!_.isNull(admin) && !_.isUndefined(admin) && !_.isEmpty(admin)) {
      throw new Error('Username: ' + user.username + ' already exists.')
    }

    if (user.password !== user.passconfirm) {
      throw new Error('Passwords do not match!')
    }

    const chance = new Chance()
    const adminUser = new UserSchema({
      username: user.username,
      password: user.password,
      fullname: user.fullname,
      email: user.email,
      role: adminRole._id,
      title: 'Administrator',
      accessToken: chance.hash()
    })

    const savedUser = await adminUser.save()

    const addResult = await defaultTeam.addMember(savedUser._id)
    if (!addResult) {
      throw new Error('Unable to add user to Administrator group!')
    }

    await defaultTeam.save()

    // Step 13: Create default department
    const DepartmentSchema = require('../models/department')
    await DepartmentSchema.create({
      name: 'Support - All Groups (Default)',
      teams: [defaultTeam._id],
      allGroups: true,
      groups: []
    })

    // Step 14: Save installed setting (Docker only)
    if (process.env.TRUDESK_DOCKER) {
      const S = require('../models/setting')
      const installed = new S({
        name: 'installed',
        value: true
      })
      await installed.save()
    }

    // Step 15: Write config file (non-Docker only)
    if (!process.env.TRUDESK_DOCKER) {
      const fs = require('fs')
      const configFile = path.join(__dirname, '../../config.yml')
      const configChance = new Chance()
      const YAML = require('yaml')

      const conf = {
        mongo: {
          host: host,
          port: port,
          username: username,
          password: password,
          database: database,
          shard: port === '---'
        },
        tokens: {
          secret: configChance.hash() + configChance.md5(),
          expires: 900 // 15min
        }
      }

      await new Promise((resolve, reject) => {
        fs.writeFile(configFile, YAML.stringify(conf), function (err) {
          if (err) {
            winston.error('FS Error: ' + err.message)
            return reject('FS Error: ' + err.message)
          }
          return resolve()
        })
      })
    }

    res.json({ success: true })
  } catch (err) {
    const errorMsg = typeof err === 'string' ? err : (err.message || err)
    return res.status(400).json({ success: false, error: errorMsg })
  }
}

installController.restart = function (req, res) {
  res.send()
  winston.info('Restarting server process after install...')
  process.exit(0)
}

module.exports = installController
