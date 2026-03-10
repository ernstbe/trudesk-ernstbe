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

const winston = require('winston')

const path = require('path')

const fs = require('fs')

const axios = require('axios')

const rimraf = require('rimraf')

const mkdirp = require('mkdirp')

const tar = require('tar')

const { pipeline } = require('stream/promises')

const apiPlugins = {}

const pluginPath = path.join(__dirname, '../../../../plugins')

const pluginServerUrl = 'http://plugins.trudesk.io'

apiPlugins.installPlugin = async function (req, res) {
  const packageid = req.params.packageid

  try {
    const response = await axios.get(pluginServerUrl + '/api/plugin/package/' + packageid)
    const plugin = response.data.plugin

    if (!plugin || !plugin.url) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Plugin: Not found in repository - ' + pluginServerUrl
      })
    }

    const downloadResponse = await axios.get(pluginServerUrl + '/plugin/download/' + plugin.url, {
      responseType: 'stream'
    })

    const fws = fs.createWriteStream(path.join(pluginPath, plugin.url))
    await pipeline(downloadResponse.data, fws)

    const pluginExtractFolder = path.join(pluginPath, plugin.name.toLowerCase())
    await rimraf(pluginExtractFolder)
    mkdirp.sync(pluginExtractFolder)

    await tar.extract({
      C: pluginExtractFolder,
      file: path.join(pluginPath, plugin.url)
    })

    await rimraf(path.join(pluginPath, plugin.url))

    axios.get(pluginServerUrl + '/api/plugin/package/' + plugin._id + '/increasedownloads').catch(function () {})

    res.json({ success: true, plugin })
    restartServer()
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message })
  }
}

apiPlugins.removePlugin = async function (req, res) {
  const packageid = req.params.packageid

  try {
    const response = await axios.get(pluginServerUrl + '/api/plugin/package/' + packageid)
    const plugin = response.data.plugin

    if (plugin === null) {
      return res.json({ success: false, error: 'Invalid Plugin' })
    }

    await rimraf(path.join(pluginPath, plugin.name.toLowerCase()))

    res.json({ success: true })
    restartServer()
  } catch (err) {
    if (err.message) winston.debug(err)
    return res.status(400).json({ success: false, error: err.message })
  }
}

function restartServer () {
  winston.info('Restarting server process...')
  process.exit(0)
}

module.exports = apiPlugins
