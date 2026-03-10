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
 *  Updated:    2/21/19 12:03 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import axios from 'axios'
import Log from '../../logger'

import { NOTIFICATIONS_MARK_READ } from 'serverSocket/socketEventConsts'

import { hideModal } from 'actions/common'

import BaseModal from 'containers/Modals/BaseModal'
import Button from 'components/Button'

import helpers from 'lib/helpers'

const ViewAllNotificationsModal = ({ hideModal, socket, t }) => {
  const [notifications, setNotifications] = useState([])

  useEffect(() => {
    helpers.hideAllpDropDowns()
    axios
      .get('/api/v1/users/notifications')
      .then(res => {
        setNotifications(res.data.notifications)
      })
      .catch(err => {
        helpers.UI.showSnackbar(`Error: ${err.response}`, true)
        Log.error(err.response)
      })
  }, [])

  const onNotificationClick = useCallback((e, notification) => {
    e.preventDefault()
    if (!notification || !notification.data || !notification.data.ticket || !notification.data.ticket.uid) return false

    hideModal()
    socket.emit(NOTIFICATIONS_MARK_READ, notification._id)
    History.pushState(null, null, `/tickets/${notification.data.ticket.uid}`)
  }, [hideModal, socket])

  return (
    <BaseModal large>
      <div className='uk-modal-header'>
        <h2>{t('modals.viewNotifications.title')}</h2>
      </div>
      <div className='uk-modal-content' style={{ height: '400px', overflow: 'auto' }}>
        <table className='notificationsTable'>
          <thead>
            <tr>
              <th className='type'>{t('modals.viewNotifications.type')}</th>
              <th className='title'>{t('modals.viewNotifications.title_col')}</th>
              <th className='date'>{t('modals.viewNotifications.date')}</th>
            </tr>
          </thead>
          <tbody>
            {notifications.map(notification => {
              const formattedDate = helpers.formatDate(
                notification.created,
                helpers.getShortDateFormat() + ' ' + helpers.getTimeFormat()
              )
              return (
                <tr
                  key={notification._id}
                  className='notification-row'
                  onClick={e => onNotificationClick(e, notification)}
                >
                  <td className='type'>
                    <i className='fa fa-2x fa-check' />
                  </td>
                  <td className='title'>
                    <p>{notification.title}</p>
                    <div className='body'>{notification.message}</div>
                  </td>
                  <td className='date'>
                    <time dateTime={helpers.formatDate(notification.created, 'YYY-MM-DDThh:mm')}>
                      {formattedDate}
                    </time>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className='uk-modal-footer uk-text-right'>
        <Button text={t('common.close')} flat waves onClick={() => hideModal()} />
      </div>
    </BaseModal>
  )
}

ViewAllNotificationsModal.propTypes = {
  hideModal: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  socket: state.shared.socket
})

export default withTranslation()(connect(mapStateToProps, { hideModal })(ViewAllNotificationsModal))
