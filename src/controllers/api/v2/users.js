/*
 *  users v2 controller — currently exposes notification reads, ported from
 *  v1 apiUsers.getNotifications / notificationCount so the v2-only PWA
 *  doesn't have to fall back to v1 for the notification badge.
 */

const apiUtils = require('../apiUtils')
const logger = require('../../../logger')
const notificationSchema = require('../../../models/notification')

const usersV2 = {}

usersV2.getNotifications = async function (req, res) {
  try {
    const notifications = await notificationSchema.findAllForUser(req.user._id)
    return apiUtils.sendApiSuccess(res, { notifications })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

usersV2.getNotificationCount = async function (req, res) {
  try {
    const count = await notificationSchema.getUnreadCount(req.user._id)
    return apiUtils.sendApiSuccess(res, { count })
  } catch (err) {
    logger.warn(err)
    return apiUtils.sendApiError(res, 500, err.message)
  }
}

module.exports = usersV2
