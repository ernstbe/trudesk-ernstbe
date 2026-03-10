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

const nconf = require('nconf')
const mongoose = require('mongoose')
const winston = require('../logger')
// Optionally use an in-memory MongoDB for local development
const useInMem = process.env.TD_USE_INMEM_MONGO === 'true'
let mongoMemoryServer = null

const db = {}
const mongoConnectionUri = {
  server: process.env.TD_MONGODB_SERVER || nconf.get('mongo:host'),
  port: process.env.TD_MONGODB_PORT || nconf.get('mongo:port') || '27017',
  username: process.env.TD_MONGODB_USERNAME || nconf.get('mongo:username'),
  password: process.env.TD_MONGODB_PASSWORD || nconf.get('mongo:password'),
  database: process.env.TD_MONGODB_DATABASE || nconf.get('mongo:database'),
  shard: process.env.TD_MONGODB_SHARD || nconf.get('mongo:shard')
}

let CONNECTION_URI = ''
if (!mongoConnectionUri.username) {
  CONNECTION_URI =
    'mongodb://' + mongoConnectionUri.server + ':' + mongoConnectionUri.port + '/' + mongoConnectionUri.database
  if (mongoConnectionUri.shard === true) { CONNECTION_URI = 'mongodb+srv://' + mongoConnectionUri.server + '/' + mongoConnectionUri.database }
} else {
  mongoConnectionUri.password = encodeURIComponent(mongoConnectionUri.password)
  if (mongoConnectionUri.shard === true) {
    CONNECTION_URI =
      'mongodb+srv://' +
      mongoConnectionUri.username +
      ':' +
      mongoConnectionUri.password +
      '@' +
      mongoConnectionUri.server +
      '/' +
      mongoConnectionUri.database
  } else {
    CONNECTION_URI =
      'mongodb://' +
      mongoConnectionUri.username +
      ':' +
      mongoConnectionUri.password +
      '@' +
      mongoConnectionUri.server +
      ':' +
      mongoConnectionUri.port +
      '/' +
      mongoConnectionUri.database
  }
}

if (process.env.TD_MONGODB_URI) CONNECTION_URI = process.env.TD_MONGODB_URI

let options = {
  connectTimeoutMS: 30000
}

module.exports.init = async function (callback, connectionString, opts) {
  if (connectionString) CONNECTION_URI = connectionString
  if (opts) options = opts
  options.dbName = mongoConnectionUri.database

  if (db.connection) {
    return callback(null, db)
  }
  global.CONNECTION_URI = CONNECTION_URI

  // If in-memory is requested, create and start the server (mongodb-memory-server v11+ API)
  if (useInMem && !mongoMemoryServer) {
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server')
      mongoMemoryServer = await MongoMemoryServer.create()
      CONNECTION_URI = mongoMemoryServer.getUri()
      global.CONNECTION_URI = CONNECTION_URI
      winston.info('Using in-memory MongoDB for development')
    } catch (memErr) {
      winston.warn('Failed to start in-memory MongoDB: ' + memErr.message)
    }
  }

  try {
    await mongoose.connect(CONNECTION_URI, options)

    if (!process.env.FORK) {
      winston.info('Connected to MongoDB')
    }

    db.connection = mongoose.connection
    try {
      const info = await mongoose.connection.db.admin().command({ buildInfo: 1 })
      db.version = info.version
    } catch (err) {
      winston.warn(err.message)
    }
    return callback(null, db)
  } catch (e) {
    winston.error('Oh no, something went wrong with DB! - ' + e.message)
    db.connection = null

    // If the configured server is the Docker service name 'mongo' and
    // connection failed, try a fallback to localhost. This helps when
    // Mongo is running in Docker with port 27017 published to the host
    // (docker-compose maps 27017:27017) and the app is running on the host.
    if (
      (!connectionString || connectionString === CONNECTION_URI) &&
      mongoConnectionUri.server &&
      mongoConnectionUri.server.toString().toLowerCase() === 'mongo'
    ) {
      try {
        winston.warn('Initial MongoDB connection to "mongo" failed; retrying with localhost as fallback')

        // build a localhost connection URI
        const fallback =
          'mongodb://' + 'localhost' + ':' + mongoConnectionUri.port + '/' + mongoConnectionUri.database
        CONNECTION_URI = fallback
        global.CONNECTION_URI = CONNECTION_URI

        await mongoose.connect(CONNECTION_URI, options)

        if (!process.env.FORK) {
          winston.info('Connected to MongoDB (fallback localhost)')
        }

        db.connection = mongoose.connection
        try {
          const info = await mongoose.connection.db.admin().command({ buildInfo: 1 })
          db.version = info.version
        } catch (err) {
          winston.warn(err.message)
        }
        return callback(null, db)
      } catch (err2) {
        winston.error('Fallback MongoDB connection also failed: ' + err2.message)
        return callback(err2, null)
      }
    }

    return callback(e, null)
  }
}

module.exports.db = db
module.exports.connectionuri = CONNECTION_URI
module.exports.getMemoryServer = function () { return mongoMemoryServer }
