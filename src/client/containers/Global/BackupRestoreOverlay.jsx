import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import clsx from 'clsx'

import { BACKUP_RESTORE_UI_SHOW_OVERLAY, BACKUP_RESTORE_UI_COMPLETE } from 'serverSocket/socketEventConsts'

function BackupRestoreOverlay ({ socket }) {
  const [overlayActive, setOverlayActive] = useState(false)

  const onShowRestoreOverlay = useCallback(() => {
    setOverlayActive(true)
  }, [])

  const onRestoreComplete = useCallback(() => {
    location.reload()
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on(BACKUP_RESTORE_UI_SHOW_OVERLAY, onShowRestoreOverlay)
    socket.on(BACKUP_RESTORE_UI_COMPLETE, onRestoreComplete)

    return () => {
      socket.off(BACKUP_RESTORE_UI_SHOW_OVERLAY, onShowRestoreOverlay)
      socket.off(BACKUP_RESTORE_UI_COMPLETE, onRestoreComplete)
    }
  }, [socket, onShowRestoreOverlay, onRestoreComplete])

  return (
    <div
      id='restoreBackupOverlay'
      className={clsx('loader-wrapper', !overlayActive && 'hide')}
      style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: '#ddd', zIndex: 999998 }}
    >
      <div className='page-center'>
        <h1 className='text-light' style={{ color: '#444' }}>
          Restore in Progress...
        </h1>
        <div className='uk-progress uk-progress-striped uk-progress-accent uk-active' style={{ height: '31px' }}>
          <div className='uk-progress-bar' style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  )
}

BackupRestoreOverlay.propTypes = {
  socket: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  socket: state.shared.socket
})

export default connect(mapStateToProps, {})(BackupRestoreOverlay)
