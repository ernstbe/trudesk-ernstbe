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
const sass = require('sass')
const settingUtil = require('../settings/settingsUtil')

const buildsass = {}

const sassOptionsDefaults = {
  indentedSyntax: true,
  includePaths: [path.join(__dirname, '../../src/sass')],
  outputStyle: 'compressed'
}

function sassVariable (name, value) {
  return '$' + name + ': ' + value + '\n'
}

function sassVariables (variablesObj) {
  return Object.keys(variablesObj)
    .map(function (name) {
      return sassVariable(name, variablesObj[name])
    })
    .join('\n')
}

function sassImport (path) {
  return "@import '" + path + "'\n"
}

function dynamicSass (entry, vars, success, error) {
  try {
    const dataString = sassVariables(vars) + sassImport(entry)
    const sassOptions = _.assign({}, sassOptionsDefaults, {
      data: dataString,
      indentedSyntax: true
    })

    // Use synchronous API from dart-sass
    const result = sass.compileString(dataString, {
      style: sassOptions.outputStyle === 'compressed' ? 'compressed' : 'expanded',
      loadPaths: sassOptions.includePaths,
      syntax: 'indented',
      quiet: true
    })

    return success(result.css.toString())
  } catch (err) {
    return error(err)
  }
}

function save (result) {
  const fs = require('fs')
  const themeCss = path.join(__dirname, '../../public/css/app.min.css')
  fs.writeFileSync(themeCss, result)
}

buildsass.buildDefault = function (callback) {
  dynamicSass(
    'app.sass',
    {},
    function (result) {
      save(result)
      return callback()
    },
    callback
  )
}

buildsass.build = function (callback) {
  let callbackCalled = false
  const safeCallback = function (err) {
    if (!callbackCalled) {
      callbackCalled = true
      return callback(err)
    }
  }

  settingUtil.getSettings(function (err, s) {
    if (!err && s && s.data && s.data.settings) {
      const settings = s.data.settings

      dynamicSass(
        'app.sass',
        {
          header_background: settings.colorHeaderBG ? settings.colorHeaderBG.value : '#1E88E5',
          header_primary: settings.colorHeaderPrimary ? settings.colorHeaderPrimary.value : '#FFFFFF',
          primary: settings.colorPrimary ? settings.colorPrimary.value : '#1565C0',
          secondary: settings.colorSecondary ? settings.colorSecondary.value : '#42A5F5',
          tertiary: settings.colorTertiary ? settings.colorTertiary.value : '#E3F2FD',
          quaternary: settings.colorQuaternary ? settings.colorQuaternary.value : '#BBDEFB'
        },
        function (result) {
          save(result)
          return safeCallback()
        },
        function (sassErr) {
          console.error('Sass build error:', sassErr.message)
          return safeCallback()
        }
      )
    } else {
      // Build Defaults
      dynamicSass(
        'app.sass',
        {},
        function (result) {
          save(result)
          return safeCallback()
        },
        function (sassErr) {
          console.error('Sass build error (default):', sassErr.message)
          return safeCallback()
        }
      )
    }
  })
}

module.exports = buildsass
