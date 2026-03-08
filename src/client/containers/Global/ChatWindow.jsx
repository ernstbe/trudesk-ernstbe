import React, { useRef, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import {
  MESSAGES_UI_USER_TYPING,
  MESSAGES_SAVE_CHAT_WINDOW,
  MESSAGES_SAVE_CHAT_WINDOW_COMPLETE
} from 'serverSocket/socketEventConsts'
import { sendMessage } from 'actions/messages'
import { setSessionUser } from 'actions/common'

import axios from 'axios'
import anime from 'animejs'
import $ from 'jquery'
import 'autogrow'
import helpers from 'lib/helpers'

function ChatWindow ({
  sessionUser,
  setSessionUser: setSessionUserAction,
  socket,
  sendMessage: sendMessageAction,
  conversationId
}) {
  const containerRef = useRef(null)
  const messageBoxRef = useRef(null)
  const messagesRef = useRef(null)

  const [conversation, setConversation] = useState(null)
  const [messagesPage, setMessagesPage] = useState(0)

  const onChatTextBoxGrow = useCallback((self, oldHeight, newHeight) => {
    if (oldHeight === newHeight || !messagesRef.current) return

    const $messages = $(messagesRef.current)
    $messages.css({ 'min-height': '170px', 'max-height': '220px' })
    self.parent().css({ 'max-height': '77px', 'min-height': '16px' })

    if (newHeight < 80) $messages.height($messages.height() - (newHeight - oldHeight))

    $messages.scrollTop($messages[0].scrollHeight)
  }, [])

  const onSendMessage = useCallback((text) => {
    console.log(text)
  }, [])

  const onUserTyping = useCallback((data) => {
    // console.log(data)
  }, [])

  const onSaveChatWindowComplete = useCallback(() => {
    setSessionUserAction()
  }, [setSessionUserAction])

  const getConversation = useCallback(() => {
    if (!conversationId) return

    axios
      .get(`/api/v2/messages/conversations/${conversationId}`)
      .then(res => {
        console.log(res.data)
        if (res.data.success && res.data.conversation) setConversation(res.data.conversation)
      })
      .catch(e => {
        console.log(e)
      })
  }, [conversationId])

  useEffect(() => {
    if (!socket) return
    getConversation()
    socket.on(MESSAGES_UI_USER_TYPING, onUserTyping)
    socket.on(MESSAGES_SAVE_CHAT_WINDOW_COMPLETE, onSaveChatWindowComplete)

    return () => {
      socket.off(MESSAGES_UI_USER_TYPING, onUserTyping)
      socket.off(MESSAGES_SAVE_CHAT_WINDOW_COMPLETE, onSaveChatWindowComplete)
    }
  }, [socket]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    helpers.setupScrollers()
    if (messagesRef.current) {
      helpers.scrollToBottom(messagesRef.current)
    }

    if (messageBoxRef.current) {
      $(messageBoxRef.current).autogrow({
        postGrowCallback: onChatTextBoxGrow,
        enterPressed: (self, v) => {
          onSendMessage(v)
        }
      })
    }
  })

  const onTitleClicked = useCallback((e) => {
    e.preventDefault()

    if (containerRef.current) {
      const topValue = containerRef.current.offsetTop
      anime({
        targets: containerRef.current,
        top: topValue === -280 ? '-29px' : '-280px',
        duration: 250,
        easing: 'easeInOutCirc'
      })
    }
  }, [])

  const onCloseClicked = useCallback((e) => {
    e.preventDefault()
    if (containerRef.current) {
      $(containerRef.current).hide()
    }

    // Save chat window
    if (socket) socket.emit(MESSAGES_SAVE_CHAT_WINDOW, {
      userId: sessionUser._id,
      convoId: conversationId,
      remove: true
    })
  }, [socket, sessionUser, conversationId])

  if (!sessionUser || !conversation) return null
  return (
    <div ref={containerRef} className='chat-box-position'>
      <div className='chat-box'>
        <div className='chat-box-title'>
          <div className='chat-box-title-buttons right'>
            <a href='#' className='chatCloseBtn no-ajaxy'>
              <i className='material-icons material-icons-small' onClick={e => onCloseClicked(e)}>
                close
              </i>
            </a>
          </div>
          <h4 className='chat-box-title-text-wrapper' onClick={e => onTitleClicked(e)}>
            <a href='#' className={'no-ajaxy'}>
              {conversation.partner.fullname}
            </a>
          </h4>
        </div>
        <div ref={messagesRef} className='chat-box-messages scrollable'>
          {conversation.messages.map(message => {
            if (message.owner._id.toString() === sessionUser._id.toString()) {
              return (
                <div key={message._id} className={'chat-message chat-message-user uk-clearfix'}>
                  <div className='chat-text-wrapper'>
                    <div className='chat-text chat-text-user'>
                      <div className='chat-text-inner'>
                        <span>{message.body.replace(/\n\r?/g, '<br />')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            } else {
              // From Partner
              const imageUrl = message.owner.image || 'defaultProfile.jpg'
              return (
                <div key={message._id} className={'chat-message uk-clearfix'}>
                  <div className='chat-user-profile'>
                    <img src={`/uploads/users/${imageUrl}`} alt={message.owner.fullname} />
                  </div>
                  <div className='chat-text-wrapper'>
                    <div className='chat-text'>
                      <div className='chat-text-inner'>
                        <span>{message.body.replace(/\n\r?/g, '<br />')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            }
          })}
        </div>
        <div className='chat-box-text'>
          <textarea ref={messageBoxRef} rows='1' className='textAreaAutogrow autogrow-short'></textarea>
        </div>
      </div>
    </div>
  )
}

ChatWindow.propTypes = {
  sessionUser: PropTypes.object,
  setSessionUser: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired,
  sendMessage: PropTypes.func.isRequired,
  conversationId: PropTypes.string.isRequired
}

const mapStateToProps = state => ({
  sessionUser: state.shared.sessionUser,
  socket: state.shared.socket
})

export default connect(mapStateToProps, { sendMessage, setSessionUser })(ChatWindow)
