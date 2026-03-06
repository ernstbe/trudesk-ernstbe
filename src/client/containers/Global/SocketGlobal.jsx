import React, { useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { initSocket, updateSocket } from 'actions/common'
import helpers from 'lib/helpers'
import TicketSocketEvents from 'lib2/socket/ticketSocketEvents'
import UserIdleTimer from 'lib2/userIdleTimer'

function SocketGlobal ({ socket, initSocket: initSocketAction, updateSocket: updateSocketAction }) {
  const socketRef = useRef(socket)
  socketRef.current = socket

  const refreshSocketState = useCallback((socketData) => {
    updateSocketAction({ socket: socketData })
  }, [updateSocketAction])

  const onReconnect = useCallback((socketData) => {
    helpers.UI.hideDisconnectedOverlay()
    updateSocketAction({ socket: socketData })
  }, [updateSocketAction])

  const onDisconnect = useCallback((socketData) => {
    helpers.UI.showDisconnectedOverlay()
    refreshSocketState(socketData)

    socketRef.current.io.removeAllListeners('reconnect_attempt')
    socketRef.current.io.on('reconnect_attempt', function (s) {
      helpers.UI.showDisconnectedOverlay()
      refreshSocketState(s)
    })

    socketRef.current.removeAllListeners('connect_timeout')
    socketRef.current.on('connect_timeout', function (s) {
      helpers.UI.showDisconnectedOverlay()
      refreshSocketState(s)
    })
  }, [refreshSocketState])

  useEffect(() => {
    initSocketAction().then(() => {
      socketRef.current.on('connect', onReconnect)
      socketRef.current.on('connecting', refreshSocketState)
      socketRef.current.io.on('reconnect', onReconnect)
      socketRef.current.on('disconnect', onDisconnect)
    })

    return () => {
      if (socketRef.current) {
        socketRef.current.off('connect', refreshSocketState)
        socketRef.current.off('connecting', refreshSocketState)
        socketRef.current.io.off('reconnect', onReconnect)
        socketRef.current.off('disconnect', onDisconnect)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

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
  socket: state.shared.socket
})

export default connect(mapStateToProps, { initSocket, updateSocket })(SocketGlobal)
