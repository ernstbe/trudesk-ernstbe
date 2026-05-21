const settingSchema = require('../models/setting')
const ticketStatusSchema = require('../models/ticketStatus')

async function resolveDefaultTicketStatus () {
  const setting = await settingSchema.getSettingByName('ticket:status:default')
  if (setting && setting.value) {
    const status = await ticketStatusSchema.findOne({ _id: setting.value })
    if (status) return status
  }
  return ticketStatusSchema.findOne({ order: 0 })
}

module.exports = { resolveDefaultTicketStatus }
