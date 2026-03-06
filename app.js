#!/usr/bin/env node

/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    5/11/22 2:26 AM
 *  Copyright (c) 2014-2022 Trudesk, Inc. All rights reserved.
 */

const async = require('async')
const path = require('path')
const fs = require('fs')
const winston = require('./src/logger')
const nconf = require('nconf')
const Chance = require('chance')
const chance = new Chance()
const pkg = require('./package.json')
// `const memory = require('./src/memory');

const isDocker = process.env.TRUDESK_DOCKER || false

global.forks = []

nconf.argv().env()

global.env = process.env.NODE_ENV || 'development'

if (!process.env.FORK) {
  winston.info('    .                              .o8                     oooo')
  winston.info('  .o8                             "888                     `888')
  winston.info('.o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo')
  winston.info('  888   `888""8P `888  `888  d88\' `888  d88\' `88b d88(  "8  888 .8P\'')
  winston.info('  888    888      888   888  888   888  888ooo888 `"Y88b.   888888.')
  winston.info('  888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.')
  winston.info('  "888" d888b     `V88V"V8P\' `Y8bod88P" `Y8bod8P\' 8""888P\' o888o o888o')
  winston.info('==========================================================================')
  winston.info('trudesk v' + pkg.version + ' Copyright (C) 2014-2023 Chris Brame')
  winston.info('')
  winston.info('Running in: ' + global.env)
  winston.info('Server Time: ' + new Date())
}

let configFile = path.join(__dirname, '/config.yml')

if (nconf.get('config')) {
  configFile = path.resolve(__dirname, nconf.get('config'))
}

// Make sure we convert the .json file to .yml
checkForOldConfig()

const configExists = fs.existsSync(configFile)

function launchInstallServer () {
  // Load the defaults for the install server
  nconf.defaults({
    tokens: {
      secret: chance.hash() + chance.md5()
    }
  })

  const ws = require('./src/webserver')
  ws.installServer(function () {
    return winston.info('Trudesk Install Server Running...')
  })
}

if (nconf.get('install') || (!configExists && !isDocker)) {
  launchInstallServer()
}

function loadConfig () {
  nconf.file({
    file: configFile,
    format: require('nconf-yaml')
  })

  // Must load after file
  nconf.defaults({
    base_dir: __dirname,
    tokens: {
      secret: chance.hash() + chance.md5(),
      expires: 900
    }
  })
}

function checkForOldConfig () {
  const oldConfigFile = path.join(__dirname, '/config.json')
  if (fs.existsSync(oldConfigFile)) {
    // Convert config to yaml.
    const content = fs.readFileSync(oldConfigFile)
    const YAML = require('yaml')
    const data = JSON.parse(content)

    fs.writeFileSync(configFile, YAML.stringify(data))

    // Rename the old config.json to config.json.bk
    fs.renameSync(oldConfigFile, path.join(__dirname, '/config.json.bk'))
  }
}

function start () {
  if (!isDocker) loadConfig()
  if (isDocker) {
    // Load some defaults for JWT token that is missing when using docker
    const jwt = process.env.TRUDESK_JWTSECRET
    nconf.defaults({
      tokens: {
        secret: jwt || chance.hash() + chance.md5(),
        expires: 900
      }
    })
  }

  const _db = require('./src/database')

  _db.init(function (err, db) {
    if (err) {
      winston.error('FETAL: ' + err.message)
      winston.warn('Retrying to connect to MongoDB in 10secs...')
      return setTimeout(function () {
        _db.init(dbCallback)
      }, 10000)
    } else {
      dbCallback(err, db)
    }
  })
}

function promisify (fn) {
  return new Promise(function (resolve, reject) {
    fn(function (err, result) {
      if (err) return reject(err)
      resolve(result)
    })
  })
}

function launchServer (db) {
  const ws = require('./src/webserver')
  ws.init(db, async function (err) {
    if (err) {
      winston.error(err)
      return
    }

    try {
      await require('./src/settings/defaults').init()
      await require('./src/permissions').register()

      try {
        await require('./src/elasticsearch').init()
      } catch (esErr) {
        winston.error(esErr)
      }

      require('./src/socketserver')(ws)

      // Start Check Mail
      try {
        const settingSchema = require('./src/models/setting')
        const mailCheckEnabled = await settingSchema.getSetting('mailer:check:enable')
        if (mailCheckEnabled && mailCheckEnabled.value) {
          const settings = await settingSchema.getSettings()
          const mailCheck = require('./src/mailer/mailCheck')
          winston.debug('Starting MailCheck...')
          mailCheck.init(settings)
        }
      } catch (mailErr) {
        winston.warn(mailErr)
      }

      await promisify(require('./src/migration').run)

      await require('./src/seeder').init()

      winston.debug('Building dynamic sass...')
      await promisify(require('./src/sass/buildsass').build)

      const cache = require('./src/cache/cache')
      if (isDocker) {
        cache.env = {
          TRUDESK_DOCKER: process.env.TRUDESK_DOCKER,
          TD_MONGODB_SERVER: process.env.TD_MONGODB_SERVER,
          TD_MONGODB_PORT: process.env.TD_MONGODB_PORT,
          TD_MONGODB_USERNAME: process.env.TD_MONGODB_USERNAME,
          TD_MONGODB_PASSWORD: process.env.TD_MONGODB_PASSWORD,
          TD_MONGODB_DATABASE: process.env.TD_MONGODB_DATABASE,
          TD_MONGODB_URI: process.env.TD_MONGODB_URI
        }
      }
      cache.init()

      await promisify(require('./src/taskrunner').init)

      ws.listen(function () {
        winston.info('trudesk Ready')
      })
    } catch (e) {
      throw new Error(e)
    }
  })
}

async function dbCallback (err, db) {
  if (err || !db) {
    return start()
  }

  if (isDocker) {
    try {
      const s = require('./src/models/setting')
      const installed = await s.getSettingByName('installed')

      if (!installed) {
        return launchInstallServer()
      } else {
        return launchServer(db)
      }
    } catch (e) {
      return start()
    }
  } else {
    return launchServer(db)
  }
}

if (!nconf.get('install') && (configExists || isDocker)) start()
