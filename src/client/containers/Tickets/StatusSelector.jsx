/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/24/19 6:33 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'
import { connect } from 'react-redux'

import { TICKETS_STATUS_SET, TICKETS_UI_STATUS_UPDATE } from 'serverSocket/socketEventConsts'
import { fetchTicketStatus } from 'actions/tickets'

function StatusSelector ({
  ticketId,
  status: statusProp,
  onStatusChange,
  hasPerm = false,
  socket,
  fetchTicketStatus: propsFetchTicketStatus,
  ticketStatuses
}) {
  const [status, setStatus] = useState(statusProp)
  const selectorButtonRef = useRef(null)
  const dropMenuRef = useRef(null)

  useEffect(() => {
    setStatus(statusProp)
  }, [statusProp])

  const forceClose = useCallback(() => {
    dropMenuRef.current.classList.remove('shown')
    dropMenuRef.current.classList.add('hide')
  }, [])

  const onDocumentClick = useCallback(
    e => {
      if (!selectorButtonRef.current.contains(e.target) && dropMenuRef.current.classList.contains('shown')) forceClose()
    },
    [forceClose]
  )

  const onUpdateTicketStatus = useCallback(
    data => {
      if (ticketId === data.tid) {
        setStatus(data.status)
        if (onStatusChange) onStatusChange(data.status)
      }
    },
    [ticketId, onStatusChange]
  )

  useEffect(() => {
    if (!socket) return
    document.addEventListener('click', onDocumentClick)
    socket.on(TICKETS_UI_STATUS_UPDATE, onUpdateTicketStatus)
    propsFetchTicketStatus()

    return () => {
      document.removeEventListener('click', onDocumentClick)
      socket.off(TICKETS_UI_STATUS_UPDATE, onUpdateTicketStatus)
    }
  }, [socket, onDocumentClick, onUpdateTicketStatus, propsFetchTicketStatus])

  const toggleDropMenu = useCallback(
    e => {
      e.stopPropagation()
      if (!hasPerm) return
      const hasHide = dropMenuRef.current.classList.contains('hide')
      const hasShown = dropMenuRef.current.classList.contains('shown')
      hasHide ? dropMenuRef.current.classList.remove('hide') : dropMenuRef.current.classList.add('hide')
      hasShown ? dropMenuRef.current.classList.remove('shown') : dropMenuRef.current.classList.add('shown')
    },
    [hasPerm]
  )

  const changeStatus = useCallback(
    statusValue => {
      if (!hasPerm) return

      if (socket) socket.emit(TICKETS_STATUS_SET, { _id: ticketId, value: statusValue })
      forceClose()
    },
    [hasPerm, socket, ticketId, forceClose]
  )

  const currentStatus = ticketStatuses
    ? ticketStatuses.find(s => s.get('_id') === status)
    : null

  return (
    <div className='floating-ticket-status'>
      <div
        title='Change Status'
        className={clsx(`ticket-status`, hasPerm && `cursor-pointer`)}
        style={{ color: 'white', background: currentStatus != null ? currentStatus.get('htmlColor') : '#000000' }}
        onClick={e => toggleDropMenu(e)}
        ref={selectorButtonRef}
      >
        <span>{currentStatus != null ? currentStatus.get('name') : 'Unknown'}</span>
      </div>

      {hasPerm && (
        <span className='drop-icon material-icons' style={{ left: 'auto', right: 22, bottom: -18 }}>
          keyboard_arrow_down
        </span>
      )}

      <div
        id={'statusSelect'}
        ref={dropMenuRef}
        className='hide'
        style={{ height: 25 * ticketStatuses.size + 25 }}
      >
        <ul>
          {ticketStatuses.map(
            s =>
              s && (
                <li
                  key={s.get('_id')}
                  className='ticket-status'
                  onClick={() => changeStatus(s.get('_id'))}
                  style={{ color: 'white', background: s.get('htmlColor') }}
                >
                  <span>{s.get('name')}</span>
                </li>
              )
          )}
        </ul>
      </div>
    </div>
  )
}

StatusSelector.propTypes = {
  ticketId: PropTypes.string.isRequired,
  status: PropTypes.string.isRequired,
  onStatusChange: PropTypes.func,
  hasPerm: PropTypes.bool.isRequired,
  socket: PropTypes.object.isRequired,
  fetchTicketStatus: PropTypes.func.isRequired,
  ticketStatuses: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  ticketStatuses: state.ticketsState.ticketStatuses
})

export default connect(mapStateToProps, {
  fetchTicketStatus
})(StatusSelector)
