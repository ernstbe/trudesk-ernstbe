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

const xss = require('xss')
const fs = require('fs')
const winston = require('../../logger')
const piexifjs = require('piexifjs')

const MAX_FIELD_TEXT_LENGTH = 255
const MAX_SHORT_FIELD_TEXT_LENGTH = 25
const MAX_EXTREME_TEXT_LENGTH = 2000

module.exports.applyMaxTextLength = function (text) {
  return text.toString().substring(0, MAX_FIELD_TEXT_LENGTH)
}

module.exports.applyMaxShortTextLength = function (text) {
  return text.toString().substring(0, MAX_SHORT_FIELD_TEXT_LENGTH)
}

module.exports.applyExtremeTextLength = function (text) {
  return text.toString().substring(0, MAX_EXTREME_TEXT_LENGTH)
}

module.exports.sanitizeFieldPlainText = function (text) {
  return xss(text, {
    whileList: {},
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script']
  })
}

module.exports.stripExifData = function (path) {
  try {
    const imgData = fs.readFileSync(path).toString('binary')
    const newImgData = piexifjs.remove(imgData)
    fs.writeFileSync(path, newImgData, 'binary')
  } catch (e) {
    winston.warn(e)
  }
}

module.exports.sendToSelf = function (socket, method, data) {
  socket.emit(method, data)
}

module.exports._sendToSelf = function (io, socketId, method, data) {
  io.sockets.sockets.forEach(function (socket) {
    if (socket.id === socketId) {
      socket.emit(method, data)
    }
  })
}

module.exports.sendToAllConnectedClients = function (io, method, data) {
  io.sockets.emit(method, data)
}

module.exports.sendToAllClientsInRoom = function (io, room, method, data) {
  io.sockets.in(room).emit(method, data)
}

module.exports.sendToUser = function (socketList, userList, username, method, data) {
  let userOnline = null
  Object.keys(userList).forEach(function (k) {
    const v = userList[k]
    if (k.toLowerCase() === username.toLowerCase()) {
      userOnline = v
    }
  })

  if (userOnline === null) return true

  userOnline.sockets.forEach(function (socket) {
    const o = Object.keys(socketList).find(k => socketList[k] && socketList[k].id === socket)
    const i = socketList[o]
    if (i === undefined) return true
    i.emit(method, data)
  })
}

module.exports.sendToAllExcept = function (io, exceptSocketId, method, data) {
  io.sockets.sockets.forEach(function (socket) {
    if (socket.id !== exceptSocketId) {
      socket.emit(method, data)
    }
  })
}

module.exports.disconnectAllClients = function (io) {
  Object.keys(io.sockets.sockets).forEach(function (sock) {
    io.sockets.sockets[sock].disconnect(true)
  })
}
