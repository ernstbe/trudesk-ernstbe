/*
     .                              .o8                     oooo
   .o8                             "888                     `888
 .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
   888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
   888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
   888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
   "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 ========================================================================
 Created:    10/30/2018
 Author:     Chris Brame

 **/

const _ = require('lodash')
const mongoose = require('mongoose')

const COLLECTION = 'role_order'

const roleOrder = mongoose.Schema({
  order: [mongoose.Schema.Types.ObjectId]
})

roleOrder.statics.getOrder = async function () {
  return this.model(COLLECTION)
    .findOne({})
    .exec()
}

roleOrder.statics.getOrderLean = async function () {
  return this.model(COLLECTION)
    .findOne({})
    .lean()
    .exec()
}

roleOrder.methods.updateOrder = async function (order) {
  this.order = order
  return this.save()
}

roleOrder.methods.getHierarchy = function (checkRoleId) {
  const idx = _.findIndex(this.order, function (i) {
    return i.toString() === checkRoleId.toString()
  })
  if (idx === -1) return []
  if (idx === 0) return this.order
  return _.drop(this.order, idx)
}

roleOrder.methods.removeFromOrder = async function (_id) {
  this.order = _.filter(this.order, function (o) {
    return o.toString() !== _id.toString()
  })

  return this.save()
}

module.exports = mongoose.model(COLLECTION, roleOrder, COLLECTION)
