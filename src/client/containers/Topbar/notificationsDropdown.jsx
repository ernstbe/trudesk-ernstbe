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
 *  Updated:    2/11/19 11:06 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import moment from 'moment-timezone'

import PDropdown from 'components/PDropdown'

import helpers from 'lib/helpers'
import { NOTIFICATIONS_UPDATE, NOTIFICATIONS_MARK_READ, NOTIFICATIONS_CLEAR } from 'serverSocket/socketEventConsts'
import 'history'

function NotificationsDropdownPartial ({ socket, shortDateFormat, timezone, onViewAllNotificationsClick, ref }) {
  const [notifications, setNotifications] = useState([])

  const onSocketUpdateNotifications = useCallback((data) => {
    setNotifications(prev => !helpers.arrayIsEqual(prev, data.items) ? data.items : prev)
  }, [])

  const clearNotificationsClicked = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()

    if (socket) socket.emit(NOTIFICATIONS_CLEAR)
  }, [socket])

  const markNotificationRead = useCallback((e, notification) => {
    e.preventDefault()
    e.stopPropagation()

    if (socket) socket.emit(NOTIFICATIONS_MARK_READ, notification._id)

    History.pushState(null, null, `/tickets/${notification.data.ticket.uid}`)
  }, [socket])

  useEffect(() => {
    if (!socket) return
    socket.on(NOTIFICATIONS_UPDATE, onSocketUpdateNotifications)

    return () => {
      socket.off(NOTIFICATIONS_UPDATE, onSocketUpdateNotifications)
    }
  }, [socket, onSocketUpdateNotifications])

  return (
    <PDropdown
      ref={ref}
      id='notifications'
      title='Notifications'
      topOffset={-4}
      leftOffset={4}
      rightComponent={
        <a className='hoverUnderline no-ajaxy' onClick={e => clearNotificationsClicked(e)}>
          Clear Notifications
        </a>
      }
      footerComponent={
        <div className={'uk-text-center' + (notifications.length < 1 ? ' hide' : '')}>
          <a className='no-ajaxy hoverUnderline' onClick={onViewAllNotificationsClick}>
            View All Notifications
          </a>
        </div>
      }
    >
      {notifications.map(notification => {
        const formattedTimestamp = moment
          .utc(notification.created)
          .tz(timezone)
          .format('YYYY-MM-DDThh:mm')
        const formattedDate = moment
          .utc(notification.created)
          .tz(timezone)
          .format(shortDateFormat)
        return (
          <li key={notification._id}>
            <a className='item no-ajaxy' onClick={e => markNotificationRead(e, notification)}>
              <div className='uk-clearfix'>
                {notification.unread && <div className='messageUnread' />}
                {notification.type === 0 && (
                  <div className='messageIcon left'>
                    <i className='fa fa-check green' />
                  </div>
                )}
                {notification.type === 1 && (
                  <div className='messageIcon left'>
                    <i className='fa fa-comment-o green' style={{ marginTop: '-5px' }} />
                  </div>
                )}
                {notification.type === 2 && (
                  <div className='messageIcon left'>
                    <i className='fa fa-exclamation red' />
                  </div>
                )}
                <div className='messageAuthor'>
                  <strong>{notification.title}</strong>
                </div>
                <div className='messageSnippet'>
                  <span>{notification.message}</span>
                </div>
                <div className='messageDate'>
                  <time dateTime={formattedTimestamp} className='timestamp'>
                    {formattedDate}
                  </time>
                </div>
              </div>
            </a>
          </li>
        )
      })}
    </PDropdown>
  )
}

NotificationsDropdownPartial.propTypes = {
  socket: PropTypes.object.isRequired,
  timezone: PropTypes.string.isRequired,
  shortDateFormat: PropTypes.string.isRequired,
  onViewAllNotificationsClick: PropTypes.func.isRequired,
  ref: PropTypes.any
}

const mapStateToProps = state => ({
  socket: state.shared.socket
})

export default connect(mapStateToProps, {})(NotificationsDropdownPartial)
