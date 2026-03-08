import React, { useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { initSocket, updateSocket } from 'actions/common'
import helpers from 'lib/helpers'
import TicketSocketEvents from 'lib2/socket/ticketSocketEvents'
import UserIdleTimer from 'lib2/userIdleTimer'

function SocketGlobal ({ socket, socketInitialized, initSocket: initSocketAction, updateSocket: updateSocketAction }) {
  const socketRef = useRef(socket)
  socketRef.current = socket

  const refreshSocketState = useCallback((socketData) => {
    updateSocketAction({ socket: socketData })
  }, [updateSocketAction])

  const onReconnect = useCallback(() => {
    helpers.UI.hideDisconnectedOverlay()
  }, [])

  const onDisconnect = useCallback(() => {
    helpers.UI.showDisconnectedOverlay()
  }, [])

  useEffect(() => {
    initSocketAction()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!socketInitialized || !socketRef.current || typeof socketRef.current.on !== 'function') return

    const s = socketRef.current
    s.on('connect', onReconnect)
    s.io.on('reconnect', onReconnect)
    s.on('disconnect', onDisconnect)

    s.io.on('reconnect_attempt', function () {
      helpers.UI.showDisconnectedOverlay()
    })

    return () => {
      s.off('connect', onReconnect)
      s.io.off('reconnect', onReconnect)
      s.off('disconnect', onDisconnect)
    }
  }, [socketInitialized]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <UserIdleTimer />
      <TicketSocketEvents />
    </>
  )
}

SocketGlobal.propTypes = {
  initSocket: PropTypes.func.isRequired,
  updateSocket: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired
}

const mapStateToProps = state => ({
  socket: state.shared.socket,
  socketInitialized: state.shared.socketInitialized
})

export default connect(mapStateToProps, { initSocket, updateSocket })(SocketGlobal)
