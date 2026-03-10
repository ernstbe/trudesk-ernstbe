import React, { useRef, useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import clsx from 'clsx'

import { withTranslation } from 'react-i18next'

import { fetchAccounts, unloadAccounts } from 'actions/accounts'

import {
  fetchConversations,
  fetchSingleConversation,
  setCurrentConversation,
  unloadSingleConversation,
  unloadConversations,
  deleteConversation,
  sendMessage,
  receiveMessage
} from 'actions/messages'
import {
  MESSAGES_USER_TYPING,
  MESSAGES_UI_USER_TYPING,
  MESSAGES_SEND,
  MESSAGES_UI_RECEIVE
} from 'serverSocket/socketEventConsts'

import Avatar from 'components/Avatar/Avatar'
import SpinLoader from 'components/SpinLoader'
import PageTitle from 'components/PageTitle'
import Grid from 'components/Grid'
import GridItem from 'components/Grid/GridItem'

import { startConversation } from 'lib2/chat'
import UIKit from 'uikit'
import $ from 'jquery'
import helpers from 'lib/helpers'

function MessagesContainer ({
  sessionUser,
  socket,
  fetchAccounts: fetchAccountsAction,
  unloadAccounts: unloadAccountsAction,
  accountsState,
  fetchConversations: fetchConversationsAction,
  unloadConversations: unloadConversationsAction,
  deleteConversation: deleteConversationAction,
  fetchSingleConversation: fetchSingleConversationAction,
  setCurrentConversation: setCurrentConversationAction,
  unloadSingleConversation: unloadSingleConversationAction,
  sendMessage: sendMessageAction,
  receiveMessage: receiveMessageAction,
  messagesState,
  initialConversation,
  showNewConvo,
  t
}) {
  const [userListShown, setUserListShown] = useState(false)
  const [userListSearchText, setUserListSearchText] = useState('')
  const [mutableUserList, setMutableUserList] = useState([])
  const [singleConversationLoaded, setSingleConversationLoaded] = useState(false)
  const [showNewConvoLoaded, setShowNewConvoLoaded] = useState(false)

  const typingTimersRef = useRef({})
  const conversationScrollSpy = useRef(null)
  const userTypingBubbles = useRef(null)
  const messagesContainer = useRef(null)

  const scrollToMessagesBottom = useCallback((hideLoader) => {
    setTimeout(() => {
      if (messagesContainer.current) helpers.scrollToBottom($(messagesContainer.current), false)
      if (hideLoader) setSingleConversationLoaded(true)
    }, 100)
  }, [])

  const _stopTyping = useCallback((cid, from) => {
    const typingTimerKey = `${cid}_${from}`
    typingTimersRef.current[typingTimerKey] = undefined

    // Hide Bubbles
    if (messagesState.currentConversation) {
      if (messagesState.currentConversation.get('_id').toString() === cid.toString()) {
        if (userTypingBubbles.current && !userTypingBubbles.current.classList.contains('hide')) { userTypingBubbles.current.classList.add('hide') }
      }
    }
  }, [messagesState.currentConversation])

  const onReceiveMessage = useCallback((data) => {
    data.isOwner = data.message.owner._id.toString() === sessionUser._id.toString()
    receiveMessageAction(data)

    // Hide Bubbles
    const currentConversation = messagesState.currentConversation
    if (
      !data.isOwner &&
      currentConversation &&
      currentConversation.get('_id').toString() === data.message.conversation.toString()
    ) {
      if (userTypingBubbles.current && !userTypingBubbles.current.classList.contains('hide')) { userTypingBubbles.current.classList.add('hide') }
    }
  }, [sessionUser, receiveMessageAction, messagesState.currentConversation])

  const onUserIsTyping = useCallback((data) => {
    const typingTimerKey = `${data.cid}_${data.from}`
    if (typingTimersRef.current[typingTimerKey]) {
      clearTimeout(typingTimersRef.current[typingTimerKey])
    }

    typingTimersRef.current[typingTimerKey] = setTimeout(_stopTyping, 10000, data.cid, data.from)

    // Show Bubbles
    if (messagesState.currentConversation) {
      if (messagesState.currentConversation.get('_id').toString() === data.cid.toString()) {
        scrollToMessagesBottom(false)
        if (userTypingBubbles.current && userTypingBubbles.current.classList.contains('hide')) { userTypingBubbles.current.classList.remove('hide') }
      }
    }
  }, [messagesState.currentConversation, scrollToMessagesBottom, _stopTyping])

  const setupContextMenu = useCallback(() => {
    // Setup Context Menu
    helpers.setupContextMenu('#conversationList > ul > li', function (action, target) {
      let $li = $(target)
      if (!$li.is('li')) {
        $li = $(target).parents('li')
      }
      const convoId = $li.attr('data-conversation-id')
      if (action.toLowerCase() === 'delete') {
        UIKit.modal.confirm(
          t('messages.deleteConfirm'),
          function () {
            // Confirm
            deleteConversationAction({ convoId })
          },
          // Cancel Function
          function () {},
          {
            labels: { Ok: t('common.yes') },
            confirmButtonClass: 'md-btn-danger'
          }
        )
      }
    })
  }, [t, deleteConversationAction])

  useEffect(() => {
    if (!socket) return
    fetchConversationsAction()

    socket.on(MESSAGES_UI_USER_TYPING, onUserIsTyping)
    socket.on(MESSAGES_UI_RECEIVE, onReceiveMessage)

    helpers.resizeFullHeight()

    if (initialConversation) {
      fetchSingleConversationAction({ _id: initialConversation }).then(() => {
        scrollToMessagesBottom(true)
      })
    }

    return () => {
      unloadAccountsAction()
      unloadConversationsAction()
      unloadSingleConversationAction()

      socket.off(MESSAGES_UI_USER_TYPING, onUserIsTyping)
      socket.off(MESSAGES_UI_RECEIVE, onReceiveMessage)
    }
  }, [socket])

  useEffect(() => {
    helpers.resizeAll()
    helpers.setupScrollers()
    setupContextMenu()

    // Hack in a way to show the user list on the /startconversation route
    if (sessionUser && showNewConvo === 'true' && !showNewConvoLoaded) {
      setShowNewConvoLoaded(true)
      showUserList()
    }
  })

  const showUserList = useCallback((e) => {
    if (e) e.preventDefault()
    if (sessionUser.role.isAdmin || sessionUser.role.isAgent) {
      fetchAccountsAction({ type: 'all', limit: -1 }).then(() => {
        setMutableUserList(accountsState.accounts)
        setUserListShown(true)
      })
    } else {
      fetchAccountsAction({ type: 'agents' }).then(() => {
        setMutableUserList(accountsState.accounts)
        setUserListShown(true)
      })
    }
  }, [sessionUser, fetchAccountsAction, accountsState.accounts])

  const hideUserList = useCallback((e) => {
    if (e) e.preventDefault()
    unloadAccountsAction()
    setUserListShown(false)
  }, [unloadAccountsAction])

  const onUserListSearchChange = useCallback((e) => {
    const searchText = e.target.value
    setUserListSearchText(searchText)
    if (searchText.length > 3) {
      setMutableUserList(accountsState.accounts.filter(i =>
        i
          .get('fullname')
          .toLowerCase()
          .includes(searchText.toLowerCase())
      ))
    } else setMutableUserList(accountsState.accounts)
  }, [accountsState.accounts])

  const onUserStartConversationClick = useCallback((account) => {
    if (!account || !sessionUser) {
      helpers.UI.showSnackbar(t('messages.invalidParticipants'), true)
      return false
    }

    startConversation(sessionUser._id, account.get('_id'))
      .then(conversation => {
        setUserListShown(false)
        unloadAccountsAction()

        unloadConversationsAction().then(() => {
          fetchConversationsAction()
        })

        unloadSingleConversationAction().then(() => {
          setSingleConversationLoaded(false)
          fetchSingleConversationAction({ _id: conversation._id }).then(() => {
            scrollToMessagesBottom(true)
          })
        })
      })
      .catch(err => {
        helpers.UI.showSnackbar(err.message, true)
      })
  }, [sessionUser, t, unloadAccountsAction, unloadConversationsAction, fetchConversationsAction, unloadSingleConversationAction, fetchSingleConversationAction, scrollToMessagesBottom])

  const onConversationClicked = useCallback((id) => {
    if (
      messagesState.currentConversation &&
      messagesState.currentConversation.get('_id').toString() === id.toString()
    ) { return }

    unloadSingleConversationAction().then(() => {
      setSingleConversationLoaded(false)
      fetchSingleConversationAction({ _id: id }).then(() => {
        scrollToMessagesBottom(true)
      })
    })
  }, [messagesState.currentConversation, unloadSingleConversationAction, fetchSingleConversationAction, scrollToMessagesBottom])

  const onSendMessageKeyDown = useCallback((e, cid, to) => {
    if (e.code !== 'Enter' || e.code !== 'NumpadEnter') {
      if (socket) socket.emit(MESSAGES_USER_TYPING, { cid, to, from: sessionUser._id })
    }
  }, [socket, sessionUser])

  const onSendMessageSubmit = useCallback((e, cId, to) => {
    e.preventDefault()
    if (!cId || !to) return

    if (e.target.chatMessage && e.target.chatMessage.value !== '') {
      sendMessageAction({
        cId,
        owner: sessionUser._id,
        body: e.target.chatMessage.value.trim()
      })
        .then(res => {
          if (socket) {
            socket.emit(MESSAGES_SEND, {
              to,
              from: sessionUser._id,
              message: res.message
            })
          }

          $(e.target.chatMessage).val('')

          scrollToMessagesBottom()
        })
    }
  }, [sessionUser, socket, sendMessageAction, scrollToMessagesBottom])

  const { currentConversation } = messagesState

  return (
    <div>
      <Grid>
        <GridItem width='3-10' extraClass='full-height'>
          <PageTitle
            title={t('messages.conversations')}
            extraClasses='page-title-border-right'
            hideBorderBottom
            rightComponent={
              <div className='uk-position-relative'>
                <div id='convo-actions' style={{ position: 'absolute', top: 20, right: 15 }}>
                  {!userListShown && (
                    <a
                      title={t('messages.startConversation')}
                      className='no-ajaxy'
                      style={{ display: 'block', height: 28 }}
                      onClick={e => showUserList(e)}
                    >
                      <i className='material-icons' style={{ fontSize: '28px', fontWeight: 300 }}>
                        add
                      </i>
                    </a>
                  )}
                  {userListShown && (
                    <a
                      className='no-ajaxy'
                      style={{ height: 28, lineHeight: '30px', fontSize: '16px', fontWeight: 300 }}
                      onClick={e => hideUserList(e)}
                    >
                      {t('common.cancel')}
                    </a>
                  )}
                </div>
              </div>
            }
          />

          {!userListShown && (
            <div id='conversationList' className='page-content-left noborder full-height'>
              <ul className='message-items scrollable'>
                {messagesState.conversations.map(convo => {
                  const partnerId = convo.get('partner').get('_id')
                  const partnerImage = convo.get('partner').get('image') || 'defaultProfile.jpg'
                  const updatedDate = helpers.getCalendarDate(convo.get('updatedAt'))
                  const isCurrentConversation = !!(
                    messagesState.currentConversation &&
                    messagesState.currentConversation.toJS()._id.toString() === convo.toJS()._id.toString()
                  )

                  return (
                    <li
                      key={convo.get('_id')}
                      className={clsx(isCurrentConversation && 'active')}
                      data-conversation-id={convo.get('_id')} // Used for ContextMenu
                      onClick={() => onConversationClicked(convo.get('_id'))}
                    >
                      <Avatar userId={partnerId} image={partnerImage} />
                      <div className='convo-info'>
                        <span className='message-from'>{convo.get('partner').get('fullname')}</span>
                        <span className='message-date'>{updatedDate}</span>
                        <span className='message-subject'>{convo.get('recentMessage')}</span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
          {userListShown && (
            <div id='conversationUserList' className='page-content-left noborder full-height'>
              <div className='search-box'>
                <input
                  type='text'
                  placeholder={t('common.search')}
                  value={userListSearchText}
                  onChange={e => onUserListSearchChange(e)}
                />
              </div>
              <ul className='message-items scrollable'>
                {mutableUserList.map(account => {
                  const accountImage = account.get('image') || 'defaultProfile.jpg'
                  if (account.get('_id').toString() === sessionUser._id.toString()) return null
                  return (
                    <li key={account.get('_id')} onClick={() => onUserStartConversationClick(account)}>
                      <Avatar userId={account.get('_id')} image={accountImage} />
                      <div className='convo-info'>
                        <span className='message-from'>{account.get('fullname')}</span>
                        <span className='message-date'>{account.get('title')}</span>
                        <span className='message-subject'>
                          <a href={`mailto:${account.get('email')}`}>{account.get('email')}</a>
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </GridItem>
        {currentConversation && (
          <GridItem width='7-10' extraClass='nopadding page-message uk-position-relative'>
            <SpinLoader active={!singleConversationLoaded} animate animateDelay={300} />
            <div
              ref={messagesContainer}
              className='page-content page-content-right full-height scrollable'
              data-offset={41}
              style={{ marginBottom: '41px !important' }}
            >
              <span className='conversation-start'>
                {t('messages.conversationStartedOn')} {helpers.formatDate(currentConversation.get('createdAt'), helpers.getLongDateWithTimeFormat())}
              </span>
              {currentConversation.get('requestingUserMeta').get('deletedAt') && (
                <span className='conversation-deleted'>
                  {t('messages.conversationDeletedAt')} {helpers.formatDate(currentConversation.get('requestingUserMeta').get('deletedAt'), helpers.getLongDateWithTimeFormat())}
                </span>
              )}
              <div ref={conversationScrollSpy} className={clsx('uk-text-center', 'uk-hidden')}>
                <i className='uk-icon-refresh uk-icon-spin' />
              </div>
              <div id='messages'>
                {currentConversation.get('messages').map(message => {
                  const ownerImage = message.get('owner').get('image') || 'defaultProfile.jpg'
                  const isMessageOwner =
                    message
                      .get('owner')
                      .get('_id')
                      .toString() === sessionUser._id
                  const formattedDate = helpers.formatDate(
                    message.get('createdAt'),
                    helpers.getShortDateWithTimeFormat()
                  )
                  return (
                    <div key={message.get('_id')}>
                      {!isMessageOwner && (
                        <div className='message message-left'>
                          <img
                            src={`/uploads/users/${ownerImage}`}
                            alt='Profile Image'
                            title={formattedDate}
                            data-uk-tooltip="{pos: 'left', animation: false}"
                          />
                          <div className='message-body'>{message.get('body')}</div>
                        </div>
                      )}
                      {isMessageOwner && (
                        <div className='message message-right'>
                          <div
                            className='message-body'
                            data-uk-tooltip="{pos:'right', animation: false}"
                            title={formattedDate}
                          >
                            {message.get('body')}
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                <div ref={userTypingBubbles} className='user-is-typing-wrapper padding-10 uk-clearfix hide'>
                  <div className='chat-user-profile smaller' style={{ position: 'relative', float: 'left', left: 0 }}>
                    <img
                      className='round profileImage'
                      src={`/uploads/users/${currentConversation.get('partner').get('image') ||
                        'defaultProfile.jpg'}`}
                      alt=''
                    />
                  </div>
                  <div
                    className='user-is-typing hide-arrow'
                    style={{ marginLeft: 40, marginTop: 3, background: '#ddd', border: 'none' }}
                  >
                    <div className='dot' />
                    <div className='dot' />
                    <div className='dot' />
                  </div>
                </div>
              </div>
            </div>
            <div className='message-textbox'>
              <form
                action='#'
                onSubmit={e =>
                  onSendMessageSubmit(
                    e,
                    currentConversation.get('_id'),
                    currentConversation.get('partner').get('_id')
                  )}
              >
                <input
                  type='text'
                  name='chatMessage'
                  placeholder={t('messages.typeMessage')}
                  onKeyDown={e =>
                    onSendMessageKeyDown(
                      e,
                      currentConversation.get('_id'),
                      currentConversation.get('partner').get('_id')
                    )}
                />
                <button type='submit'>{t('messages.send')}</button>
              </form>
            </div>
          </GridItem>
        )}
      </Grid>
      <ul className='context-menu'>
        <li data-action='delete' style={{ color: '#d32f2f' }}>
          {t('messages.deleteConversation')}
        </li>
      </ul>
    </div>
  )
}

MessagesContainer.propTypes = {
  sessionUser: PropTypes.object,
  socket: PropTypes.object.isRequired,
  fetchAccounts: PropTypes.func.isRequired,
  unloadAccounts: PropTypes.func.isRequired,
  accountsState: PropTypes.object.isRequired,
  fetchConversations: PropTypes.func.isRequired,
  unloadConversations: PropTypes.func.isRequired,
  deleteConversation: PropTypes.func.isRequired,
  fetchSingleConversation: PropTypes.func.isRequired,
  setCurrentConversation: PropTypes.func.isRequired,
  unloadSingleConversation: PropTypes.func.isRequired,
  sendMessage: PropTypes.func.isRequired,
  receiveMessage: PropTypes.func.isRequired,
  messagesState: PropTypes.object.isRequired,
  initialConversation: PropTypes.string,
  showNewConvo: PropTypes.string
}

const mapStateToProps = state => ({
  sessionUser: state.shared.sessionUser,
  socket: state.shared.socket,
  messagesState: state.messagesState,
  accountsState: state.accountsState
})

export default withTranslation()(connect(mapStateToProps, {
  fetchAccounts,
  unloadAccounts,
  fetchConversations,
  unloadConversations,
  deleteConversation,
  fetchSingleConversation,
  setCurrentConversation,
  unloadSingleConversation,
  sendMessage,
  receiveMessage
})(MessagesContainer))
