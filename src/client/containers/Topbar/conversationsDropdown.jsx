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
 *  Updated:    2/12/19 1:23 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import moment from 'moment-timezone'

import { MESSAGES_UPDATE_UI_CONVERSATION_NOTIFICATIONS } from 'serverSocket/socketEventConsts'
import PDropDown from 'components/PDropdown'

import helpers from 'lib/helpers'
import 'history'

function ConversationsDropdownPartial ({ timezone, shortDateFormat, socket, ref }) {
  const [conversations, setConversations] = useState([])

  const onUpdateConversationsNotifications = useCallback((data) => {
    helpers.setupScrollers()
    setConversations(prev => !helpers.arrayIsEqual(prev, data.conversations) ? data.conversations : prev)
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on(MESSAGES_UPDATE_UI_CONVERSATION_NOTIFICATIONS, onUpdateConversationsNotifications)

    return () => {
      socket.off(MESSAGES_UPDATE_UI_CONVERSATION_NOTIFICATIONS, onUpdateConversationsNotifications)
    }
  }, [socket, onUpdateConversationsNotifications])

  const onConversationClicked = useCallback((e, id) => {
    e.preventDefault()

    History.pushState(null, null, `/messages/${id}`)
  }, [])

  return (
    <PDropDown
      ref={ref}
      id='conversations'
      title='Conversations'
      titleHref='/messages'
      topOffset={-4}
      leftOffset={4}
      onShow={() => {
        if (socket) socket.emit(MESSAGES_UPDATE_UI_CONVERSATION_NOTIFICATIONS)
      }}
      rightComponent={
        <a href='/messages/startconversation' className='hoverUnderline'>
          Start Conversation
        </a>
      }
      footerComponent={
        <div className={'uk-text-center' + (conversations.length < 1 ? ' hide' : '')}>
          <a
            className='no-ajaxy hoverUnderline'
            onClick={() => {
              History.pushState(null, null, '/messages')
            }}
          >
            View All Conversations
          </a>
        </div>
      }
    >
      <div className='items scrollable close-on-click'>
        <ul>
          {conversations.map(conversation => {
            const profilePic = conversation.partner.image || 'defaultProfile.jpg'
            const formattedTimestamp = moment
              .utc(conversation.updatedAt)
              .tz(timezone)
              .format('YYYY-MM-DDThh:mm')
            const formattedDate = moment
              .utc(conversation.updatedAt)
              .tz(timezone)
              .format(shortDateFormat)
            return (
              <li key={conversation._id}>
                <a
                  className='no-ajaxy messageNotification uk-position-relative'
                  onClick={e => onConversationClicked(e, conversation._id)}
                >
                  <div className='uk-clearfix'>
                    <div className='profilePic uk-float-left'>
                      <img src={`/uploads/users/${profilePic}`} alt='Profile Picture' />
                    </div>
                    <div className='messageAuthor'>
                      <strong>{conversation.partner.fullname}</strong>
                    </div>
                    <div className='messageSnippet'>
                      <span>{conversation.recentMessage}</span>
                    </div>
                    <div className='messageDate' style={{ position: 'absolute', top: '10px', right: '15px' }}>
                      <time dateTime={formattedTimestamp}>{formattedDate}</time>
                    </div>
                  </div>
                </a>
              </li>
            )
          })}
        </ul>
      </div>
    </PDropDown>
  )
}

ConversationsDropdownPartial.propTypes = {
  timezone: PropTypes.string.isRequired,
  shortDateFormat: PropTypes.string.isRequired,
  socket: PropTypes.object.isRequired,
  ref: PropTypes.any.isRequired
}

export default ConversationsDropdownPartial
