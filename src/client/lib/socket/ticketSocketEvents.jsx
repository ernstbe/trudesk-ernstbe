import React, { useEffect } from 'react'
import { useSelector } from 'react-redux'
import { TICKETS_CREATED } from 'serverSocket/socketEventConsts'
import helpers from 'lib/helpers'

const TicketSocketEvents = () => {
  const socket = useSelector(state => state.shared.socket)
  const socketInitialized = useSelector(state => state.shared.socketInitialized)
  const viewdata = useSelector(state => state.common.viewdata)

  useEffect(() => {
    if (!socketInitialized || typeof socket.on !== 'function') return

    socket.removeAllListeners(TICKETS_CREATED)
    socket.on(TICKETS_CREATED, () => {
      if (viewdata) {
        if (viewdata.get('ticketSettings') && viewdata.get('ticketSettings').get('playNewTicketSound'))
          helpers.UI.playSound('TICKET_CREATED')
      } else {
        helpers.UI.playSound('TICKET_CREATED')
      }
    })

    return function cleanup () {
      socket.removeAllListeners(TICKETS_CREATED)
    }
  }, [socketInitialized, viewdata]) // eslint-disable-line react-hooks/exhaustive-deps

  return <div />
}

export default TicketSocketEvents
