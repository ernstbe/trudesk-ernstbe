/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/21/19 9:32 AM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { Fragment, useRef, useState, useEffect, useCallback, useMemo } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import sortBy from 'lodash/sortBy'
import union from 'lodash/union'

import { transferToThirdParty, fetchTicketTypes, fetchTicketStatus } from 'actions/tickets'
import { fetchGroups, unloadGroups } from 'actions/groups'
import { showModal } from 'actions/common'

import {
  TICKETS_UPDATE,
  TICKETS_UI_GROUP_UPDATE,
  TICKETS_GROUP_SET,
  TICKETS_UI_TYPE_UPDATE,
  TICKETS_TYPE_SET,
  TICKETS_UI_PRIORITY_UPDATE,
  TICKETS_PRIORITY_SET,
  TICKETS_ASSIGNEE_LOAD,
  TICKETS_ASSIGNEE_UPDATE,
  TICKETS_UI_DUEDATE_UPDATE,
  TICKETS_DUEDATE_SET,
  TICKETS_UI_TAGS_UPDATE,
  TICKETS_COMMENT_NOTE_REMOVE,
  TICKETS_COMMENT_NOTE_SET
} from 'serverSocket/socketEventConsts'

import AssigneeDropdownPartial from 'containers/Tickets/AssigneeDropdownPartial'
import Avatar from 'components/Avatar/Avatar'
import CommentNotePartial from 'containers/Tickets/CommentNotePartial'
import DatePicker from 'components/DatePicker'
import EasyMDE from 'components/EasyMDE'
import IssuePartial from 'containers/Tickets/IssuePartial'
import OffCanvasEditor from 'components/OffCanvasEditor'
import PDropdownTrigger from 'components/PDropdown/PDropdownTrigger'
import StatusSelector from 'containers/Tickets/StatusSelector'
import TruTabSection from 'components/TruTabs/TruTabSection'
import TruTabSelector from 'components/TruTabs/TruTabSelector'
import TruTabSelectors from 'components/TruTabs/TruTabSelectors'
import TruTabWrapper from 'components/TruTabs/TruTabWrapper'

import axios from 'axios'
import helpers from 'lib/helpers'
import Log from '../../logger'
import UIkit from 'uikit'
import moment from 'moment'
import SpinLoader from 'components/SpinLoader'

const showPriorityConfirm = () => {
  UIkit.modal.confirm(
    'Selected Priority does not exist for this ticket type. Priority has reset to the default for this type.' +
      '<br><br><strong>Please select a new priority</strong>',
    () => {},
    { cancelButtonClass: 'uk-hidden' }
  )
}

function SingleTicketContainer (props) {
  const {
    ticketUid,
    shared,
    sessionUser,
    socket,
    common,
    ticketTypes,
    ticketStatuses,
    groupsState,
    fetchTicketTypes: propsFetchTicketTypes,
    fetchGroups: propsFetchGroups,
    fetchTicketStatus: propsFetchTicketStatus,
    unloadGroups: propsUnloadGroups,
    showModal: propsShowModal,
    transferToThirdParty: propsTransferToThirdParty,
    t
  } = props

  const [ticket, setTicket] = useState(null)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const assigneeDropdownPartial = useRef(null)
  const editorWindowRef = useRef(null)
  const commentMDERef = useRef(null)
  const noteMDERef = useRef(null)
  // Keep a mutable ref to ticket for use in socket callbacks
  const ticketRef = useRef(null)
  ticketRef.current = ticket

  const fetchTicket = useCallback(() => {
    axios
      .get(`/api/v2/tickets/${ticketUid}`)
      .then(res => {
        const t = res.data.ticket
        setTicket(t)
        ticketRef.current = t
        setIsSubscribed(
          t && t.subscribers.findIndex(i => i._id === shared.sessionUser._id) !== -1
        )
      })
      .catch(error => {
        if (error.response.status === 403) {
          History.pushState(null, null, '/tickets')
        }
        Log.error(error)
      })
  }, [ticketUid, shared.sessionUser._id])

  const onUpdateTicket = useCallback(data => {
    if (ticketRef.current && ticketRef.current._id === data._id) {
      setTicket(data)
    }
  }, [])

  const onUpdateAssignee = useCallback(
    data => {
      if (ticketRef.current && ticketRef.current._id === data._id) {
        setTicket(prev => ({ ...prev, assignee: data.assignee }))
        if (data.assignee && data.assignee._id === shared.sessionUser._id) setIsSubscribed(true)
      }
    },
    [shared.sessionUser._id]
  )

  const onUpdateTicketType = useCallback(data => {
    if (ticketRef.current && ticketRef.current._id === data._id) {
      setTicket(prev => ({ ...prev, type: data.type }))
    }
  }, [])

  const onUpdateTicketPriority = useCallback(data => {
    if (ticketRef.current && ticketRef.current._id === data._id) {
      setTicket(prev => ({ ...prev, priority: data.priority }))
    }
  }, [])

  const onUpdateTicketGroup = useCallback(data => {
    if (ticketRef.current && ticketRef.current._id === data._id) {
      setTicket(prev => ({ ...prev, group: data.group }))
    }
  }, [])

  const onUpdateTicketDueDate = useCallback(data => {
    if (ticketRef.current && ticketRef.current._id === data._id) {
      setTicket(prev => ({ ...prev, dueDate: data.dueDate }))
    }
  }, [])

  const onUpdateTicketTags = useCallback(data => {
    if (ticketRef.current && ticketRef.current._id === data._id) {
      setTicket(prev => ({ ...prev, tags: data.tags }))
    }
  }, [])

  useEffect(() => {
    if (!socket) return
    socket.on(TICKETS_UPDATE, onUpdateTicket)
    socket.on(TICKETS_ASSIGNEE_UPDATE, onUpdateAssignee)
    socket.on(TICKETS_UI_TYPE_UPDATE, onUpdateTicketType)
    socket.on(TICKETS_UI_PRIORITY_UPDATE, onUpdateTicketPriority)
    socket.on(TICKETS_UI_GROUP_UPDATE, onUpdateTicketGroup)
    socket.on(TICKETS_UI_DUEDATE_UPDATE, onUpdateTicketDueDate)
    socket.on(TICKETS_UI_TAGS_UPDATE, onUpdateTicketTags)

    fetchTicket()
    propsFetchTicketTypes()
    propsFetchGroups()
    propsFetchTicketStatus()

    return () => {
      socket.off(TICKETS_UPDATE, onUpdateTicket)
      socket.off(TICKETS_ASSIGNEE_UPDATE, onUpdateAssignee)
      socket.off(TICKETS_UI_TYPE_UPDATE, onUpdateTicketType)
      socket.off(TICKETS_UI_PRIORITY_UPDATE, onUpdateTicketPriority)
      socket.off(TICKETS_UI_GROUP_UPDATE, onUpdateTicketGroup)
      socket.off(TICKETS_UI_DUEDATE_UPDATE, onUpdateTicketDueDate)
      socket.off(TICKETS_UI_TAGS_UPDATE, onUpdateTicketTags)

      propsUnloadGroups()
    }
  }, [socket])

  useEffect(() => {
    helpers.resizeFullHeight()
    helpers.setupScrollers()
  })

  const notesTagged = useMemo(() => {
    if (!ticket) return []
    ticket.notes.forEach(i => (i.isNote = true))
    return ticket.notes
  }, [ticket])

  const commentsAndNotes = useMemo(() => {
    if (!ticket) return []
    if (!helpers.canUser('tickets:notes', true)) {
      return sortBy(ticket.comments, 'date')
    }

    let merged = union(ticket.comments, notesTagged)
    merged = sortBy(merged, 'date')

    return merged
  }, [ticket, notesTagged])

  const hasCommentsOrNotes = useMemo(() => {
    if (!ticket) return false
    return ticket.comments.length > 0 || ticket.notes.length > 0
  }, [ticket])

  const onCommentNoteSubmit = useCallback(
    (e, type) => {
      e.preventDefault()
      const isNote = type === 'note'
      axios
        .post(`/api/v1/tickets/add${isNote ? 'note' : 'comment'}`, {
          _id: !isNote && ticket._id,
          comment: !isNote && commentMDERef.current.getEditorText(),

          ticketid: isNote && ticket._id,
          note: isNote && noteMDERef.current.getEditorText()
        })
        .then(res => {
          if (res && res.data && res.data.success) {
            if (isNote) {
              setTicket(prev => ({ ...prev, notes: res.data.ticket.notes, history: res.data.ticket.history }))
              noteMDERef.current.setEditorText('')
            } else {
              setTicket(prev => ({ ...prev, comments: res.data.ticket.comments, history: res.data.ticket.history }))
              commentMDERef.current.setEditorText('')
            }

            helpers.scrollToBottom('.page-content-right', true)
          }
        })
        .catch(error => {
          Log.error(error)
          if (error.response) Log.error(error.response)
          helpers.UI.showSnackbar(error, true)
        })
    },
    [ticket]
  )

  const onSubscriberChanged = useCallback(
    e => {
      axios
        .put(`/api/v1/tickets/${ticket._id}/subscribe`, {
          user: shared.sessionUser._id,
          subscribe: e.target.checked
        })
        .then(res => {
          if (res.data.success && res.data.ticket) {
            setTicket(prev => ({ ...prev, subscribers: res.data.ticket.subscribers }))
            setIsSubscribed(
              res.data.ticket.subscribers.findIndex(i => i._id === shared.sessionUser._id) !== -1
            )
          }
        })
        .catch(error => {
          Log.error(error.response || error)
        })
    },
    [ticket, shared.sessionUser._id]
  )

  const onTransferToThirdParty = useCallback(
    e => {
      propsTransferToThirdParty({ uid: ticket.uid })
    },
    [ticket, propsTransferToThirdParty]
  )

  const mappedGroups = groupsState
    ? groupsState.groups.map(group => {
      return { text: group.get('name'), value: group.get('_id') }
    })
    : []

  const mappedTypes = ticketTypes
    ? ticketTypes.map(type => {
      return { text: type.get('name'), value: type.get('_id'), raw: type.toJS() }
    })
    : []

  // Perms
  const hasTicketUpdate = ticket && ticket.status.isResolved === false && helpers.canUser('tickets:update')
  const statusObj = ticket ? ticketStatuses.find(s => s.get('_id') === ticket.status._id) : null

  const hasTicketStatusUpdate = () => {
    const isAgent = sessionUser ? sessionUser.role.isAgent : false
    const isAdmin = sessionUser ? sessionUser.role.isAdmin : false
    if (isAgent || isAdmin) {
      return helpers.canUser('tickets:update')
    } else {
      if (!ticket || !sessionUser) return false
      return helpers.hasPermOverRole(ticket.owner.role, sessionUser.role, 'tickets:update', false)
    }
  }

  return (
    <div className='uk-clearfix uk-position-relative' style={{ width: '100%', height: '100vh' }}>
      {!ticket && <SpinLoader active />}
      {ticket && (
        <>
          <div className='page-content'>
            <div
              className='uk-float-left page-title page-title-small noshadow nopadding relative'
              style={{ width: 360, maxWidth: 360, minWidth: 360 }}
            >
              <div className='page-title-border-right relative' style={{ padding: '0 30px' }}>
                <p>{t('tickets.ticketNumber')}{ticket.uid}</p>
                <StatusSelector
                  ticketId={ticket._id}
                  status={ticket.status._id}
                  socket={socket}
                  onStatusChange={status => {
                    setTicket(prev => ({ ...prev, status }))
                  }}
                  hasPerm={hasTicketStatusUpdate()}
                />
              </div>
              {/*  Left Side */}
              <div className='page-content-left full-height scrollable'>
                <div className='ticket-details-wrap uk-position-relative uk-clearfix'>
                  <div className='ticket-assignee-wrap uk-clearfix' style={{ paddingRight: 30 }}>
                    <h4>{t('common.assignee')}</h4>
                    <div className='ticket-assignee uk-clearfix'>
                      {hasTicketUpdate && (
                        <a
                          role='button'
                          title={t('tickets.setAssignee')}
                          style={{ float: 'left' }}
                          className='relative no-ajaxy'
                          onClick={() => { if (socket) socket.emit(TICKETS_ASSIGNEE_LOAD) }}
                        >
                          <PDropdownTrigger target={assigneeDropdownPartial}>
                            <Avatar
                              image={ticket.assignee && ticket.assignee.image}
                              showOnlineBubble={ticket.assignee !== undefined}
                              userId={ticket.assignee && ticket.assignee._id}
                            />
                            <span className='drop-icon material-icons'>keyboard_arrow_down</span>
                          </PDropdownTrigger>
                        </a>
                      )}
                      {!hasTicketUpdate && (
                        <Avatar
                          image={ticket.assignee && ticket.assignee.image}
                          showOnlineBubble={ticket.assignee !== undefined}
                          userId={ticket.assignee && ticket.assignee._id}
                        />
                      )}
                      <div className='ticket-assignee-details'>
                        {!ticket.assignee && <h3>{t('tickets.noUserAssigned')}</h3>}
                        {ticket.assignee && (
                          <>
                            <h3>{ticket.assignee.fullname}</h3>
                            <a
                              className='comment-email-link uk-text-truncate uk-display-inline-block'
                              href={`mailto:${ticket.assignee.email}`}
                            >
                              {ticket.assignee.email}
                            </a>
                            <span className='uk-display-block'>{ticket.assignee.title}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {hasTicketUpdate && (
                      <AssigneeDropdownPartial
                        forwardedRef={assigneeDropdownPartial}
                        ticketId={ticket._id}
                        onClearClick={() => setTicket(prev => ({ ...prev, assignee: undefined }))}
                        onAssigneeClick={({ agent }) => setTicket(prev => ({ ...prev, assignee: agent }))}
                      />
                    )}
                  </div>

                  <div className='uk-width-1-1 padding-left-right-15'>
                    <div className='tru-card ticket-details uk-clearfix'>
                      {/* Type */}
                      <div className='uk-width-1-2 uk-float-left nopadding'>
                        <div className='marginright5'>
                          <span>{t('common.type')}</span>
                          {hasTicketUpdate && (
                            <select
                              value={ticket.type._id}
                              onChange={e => {
                                const type = ticketTypes.find(t => t.get('_id') === e.target.value)

                                const priority = type
                                  .get('priorities')
                                  .findIndex(p => p.get('_id') === ticket.priority._id)

                                const hasPriority = priority !== -1

                                if (!hasPriority) {
                                  if (socket) {
                                    socket.emit(TICKETS_PRIORITY_SET, {
                                      _id: ticket._id,
                                      value: type.get('priorities').find(() => true)
                                    })
                                  }

                                  showPriorityConfirm()
                                }

                                if (socket) {
                                  socket.emit(TICKETS_TYPE_SET, {
                                    _id: ticket._id,
                                    value: e.target.value
                                  })
                                }
                              }}
                            >
                              {mappedTypes &&
                                mappedTypes.map(type => (
                                  <option key={type.value} value={type.value}>
                                    {type.text}
                                  </option>
                                ))}
                            </select>
                          )}
                          {!hasTicketUpdate && <div className='input-box'>{ticket.type.name}</div>}
                        </div>
                      </div>
                      {/* Priority */}
                      <div className='uk-width-1-2 uk-float-left nopadding'>
                        <div className='marginleft5'>
                          <span>{t('common.priority')}</span>
                          {hasTicketUpdate && (
                            <select
                              name='tPriority'
                              id='tPriority'
                              value={ticket.priority._id}
                              onChange={e => {
                                if (socket) {
                                  socket.emit(TICKETS_PRIORITY_SET, {
                                    _id: ticket._id,
                                    value: e.target.value
                                  })
                                }
                              }}
                            >
                              {ticket.type &&
                                ticket.type.priorities &&
                                ticket.type.priorities.map(priority => (
                                  <option key={priority._id} value={priority._id}>
                                    {t('priorities.' + priority.name, priority.name)}
                                  </option>
                                ))}
                            </select>
                          )}
                          {!hasTicketUpdate && <div className='input-box'>{t('priorities.' + ticket.priority.name, ticket.priority.name)}</div>}
                        </div>
                      </div>
                      {/*  Group */}
                      <div className='uk-width-1-1 nopadding uk-clearfix'>
                        <span>{t('common.group')}</span>
                        {hasTicketUpdate && (
                          <select
                            value={ticket.group._id}
                            onChange={e => {
                              if (socket) {
                                socket.emit(TICKETS_GROUP_SET, {
                                  _id: ticket._id,
                                  value: e.target.value
                                })
                              }
                            }}
                          >
                            {mappedGroups &&
                              mappedGroups.map(group => (
                                <option key={group.value} value={group.value}>
                                  {group.text}
                                </option>
                              ))}
                          </select>
                        )}
                        {!hasTicketUpdate && <div className='input-box'>{ticket.group.name}</div>}
                      </div>
                      {/*  Due Date */}
                      <div className='uk-width-1-1 p-0'>
                        <span>{t('tickets.dueDate')}</span> {hasTicketUpdate && <span>-&nbsp;</span>}
                        {hasTicketUpdate && (
                          <div className='uk-display-inline'>
                            <a
                              role='button'
                              onClick={e => {
                                e.preventDefault()
                                if (socket) {
                                  socket.emit(TICKETS_DUEDATE_SET, {
                                    _id: ticket._id,
                                    value: undefined
                                  })
                                }
                              }}
                            >
                              {t('tickets.clear')}
                            </a>
                            <DatePicker
                              name='ticket_due_date'
                              format={helpers.getShortDateFormat()}
                              value={ticket.dueDate}
                              small
                              onChange={e => {
                                const dueDate = moment(e.target.value, helpers.getShortDateFormat())
                                  .utc()
                                  .toISOString()

                                if (socket) socket.emit(TICKETS_DUEDATE_SET, { _id: ticket._id, value: dueDate })
                              }}
                            />
                          </div>
                        )}
                        {!hasTicketUpdate && (
                          <div className='input-box'>
                            {helpers.formatDate(ticket.dueDate, common.get('shortDateFormat'))}
                          </div>
                        )}
                      </div>

                      {/* Tags */}
                      <div className='uk-width-1-1 nopadding'>
                        <span>
                          {t('modals.createTicket.tags')}
                          {hasTicketUpdate && (
                            <>
                              <span> - </span>
                              <div id='editTags' className='uk-display-inline'>
                                <a
                                  role='button'
                                  style={{ fontSize: 11 }}
                                  className='no-ajaxy'
                                  onClick={() => {
                                    propsShowModal('ADD_TAGS_MODAL', {
                                      ticketId: ticket._id,
                                      currentTags: ticket.tags.map(tag => tag._id)
                                    })
                                  }}
                                >
                                  {t('tickets.editTags')}
                                </a>
                              </div>
                            </>
                          )}
                        </span>
                        <div className='tag-list uk-clearfix'>
                          {ticket.tags &&
                            ticket.tags.map(tag => (
                              <div key={tag._id} className='item'>
                                {tag.name}
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {helpers.canUser('agent:*', true) && (
                    <div className='uk-width-1-1 padding-left-right-15'>
                      <div className='tru-card ticket-details pr-0 pb-0' style={{ height: 250 }}>
                        {t('tickets.ticketHistory')}
                        <hr style={{ padding: 0, margin: 0 }} />
                        <div className='history-items scrollable' style={{ paddingTop: 12 }}>
                          {ticket.history &&
                            ticket.history.map(item => (
                              <div key={item._id} className='history-item'>
                                <time
                                  dateTime={helpers.formatDate(item.date, common.get('longDateFormat'))}
                                />
                                <em>
                                  {t('tickets.actionBy')} <span>{item.owner.fullname}</span>
                                </em>
                                <p>{item.description}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Right Side */}
          <div className='page-message nopadding' style={{ marginLeft: 360 }}>
            <div className='page-title-right noshadow'>
              {common.get('hasThirdParty') && (
                <div className='page-top-comments uk-float-right'>
                  <a
                    role='button'
                    className='btn md-btn-primary no-ajaxy'
                    onClick={e => {
                      e.preventDefault()
                      onTransferToThirdParty(e)
                    }}
                  >
                    {t('tickets.transferToThirdParty')}
                  </a>
                </div>
              )}
              <div className='page-top-comments uk-float-right'>
                <a
                  role='button'
                  className='btn no-ajaxy'
                  onClick={e => {
                    e.preventDefault()
                    helpers.scrollToBottom('.page-content-right', true)
                  }}
                >
                  {t('tickets.addComment')}
                </a>
              </div>
              <div
                className='onoffswitch subscribeSwitch uk-float-right'
                style={{ marginRight: 10, position: 'relative', top: 18 }}
              >
                <input
                  id='subscribeSwitch'
                  type='checkbox'
                  name='subscribeSwitch'
                  className='onoffswitch-checkbox'
                  checked={isSubscribed}
                  onChange={e => onSubscriberChanged(e)}
                />
                <label className='onoffswitch-label' htmlFor='subscribeSwitch'>
                  <span className='onoffswitch-inner subscribeSwitch-inner' />
                  <span className='onoffswitch-switch subscribeSwitch-switch' />
                </label>
              </div>
              <div className='pagination uk-float-right' style={{ marginRight: 5 }}>
                <ul className='button-group'>
                  {helpers.canUser('tickets:print') && (
                    <li className='pagination'>
                      <a
                        href={`/tickets/print/${ticket.uid}`}
                        className='btn no-ajaxy'
                        style={{ borderRadius: 3, marginRight: 5 }}
                        rel='noopener noreferrer'
                        target='_blank'
                      >
                        <i className='material-icons'>&#xE8AD;</i>
                      </a>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <div className='page-content-right full-height scrollable'>
              <div className='comments-wrapper'>
                <IssuePartial
                  ticketId={ticket._id}
                  status={statusObj}
                  owner={ticket.owner}
                  subject={ticket.subject}
                  issue={ticket.issue}
                  date={ticket.date}
                  dateFormat={`${common.get('longDateFormat')}, ${common.get('timeFormat')}`}
                  attachments={ticket.attachments}
                  editorWindow={editorWindowRef.current}
                  socket={socket}
                />

                {/* Tabs */}
                {hasCommentsOrNotes && (
                  <TruTabWrapper>
                    <TruTabSelectors style={{ marginLeft: 110 }}>
                      <TruTabSelector
                        selectorId={0}
                        label={t('tickets.all')}
                        active
                        showBadge
                        badgeText={commentsAndNotes.length}
                      />
                      <TruTabSelector
                        selectorId={1}
                        label={t('common.comments')}
                        showBadge
                        badgeText={ticket ? ticket.comments && ticket.comments.length : 0}
                      />
                      {helpers.canUser('tickets:notes', true) && (
                        <TruTabSelector
                          selectorId={2}
                          label={t('common.notes')}
                          showBadge
                          badgeText={ticket ? ticket.notes && ticket.notes.length : 0}
                        />
                      )}
                    </TruTabSelectors>

                    {/* Tab Sections */}
                    <TruTabSection sectionId={0} active>
                      <div className='all-comments'>
                        {commentsAndNotes.map(item => (
                          <CommentNotePartial
                            key={item._id}
                            ticketStatus={statusObj}
                            ticketSubject={ticket.subject}
                            comment={item}
                            isNote={item.isNote}
                            dateFormat={`${common.get('longDateFormat')}, ${common.get(
                              'timeFormat'
                            )}`}
                            onEditClick={() => {
                              editorWindowRef.current.openEditorWindow({
                                showSubject: false,
                                text: !item.isNote ? item.comment : item.note,
                                onPrimaryClick: data => {
                                  if (socket) {
                                    socket.emit(TICKETS_COMMENT_NOTE_SET, {
                                      _id: ticket._id,
                                      item: item._id,
                                      isNote: item.isNote,
                                      value: data.text
                                    })
                                  }
                                }
                              })
                            }}
                            onRemoveClick={() => {
                              if (socket) {
                                socket.emit(TICKETS_COMMENT_NOTE_REMOVE, {
                                  _id: ticket._id,
                                  value: item._id,
                                  isNote: item.isNote
                                })
                              }
                            }}
                          />
                        ))}
                      </div>
                    </TruTabSection>
                    <TruTabSection sectionId={1}>
                      <div className='comments'>
                        {ticket &&
                          ticket.comments.map(comment => (
                            <CommentNotePartial
                              key={comment._id}
                              ticketStatus={statusObj}
                              ticketSubject={ticket.subject}
                              comment={comment}
                              dateFormat={`${common.get('longDateFormat')}, ${common.get(
                                'timeFormat'
                              )}`}
                              onEditClick={() => {
                                editorWindowRef.current.openEditorWindow({
                                  showSubject: false,
                                  text: comment.comment,
                                  onPrimaryClick: data => {
                                    if (socket) {
                                      socket.emit(TICKETS_COMMENT_NOTE_SET, {
                                        _id: ticket._id,
                                        item: comment._id,
                                        isNote: comment.isNote,
                                        value: data.text
                                      })
                                    }
                                  }
                                })
                              }}
                              onRemoveClick={() => {
                                if (socket) {
                                  socket.emit(TICKETS_COMMENT_NOTE_REMOVE, {
                                    _id: ticket._id,
                                    value: comment._id,
                                    isNote: comment.isNote
                                  })
                                }
                              }}
                            />
                          ))}
                      </div>
                    </TruTabSection>
                    <TruTabSection sectionId={2}>
                      <div className='notes'>
                        {ticket &&
                          ticket.notes.map(note => (
                            <CommentNotePartial
                              key={note._id}
                              ticketStatus={statusObj}
                              ticketSubject={ticket.subject}
                              comment={note}
                              isNote
                              dateFormat={`${common.get('longDateFormat')}, ${common.get(
                                'timeFormat'
                              )}`}
                              onEditClick={() => {
                                editorWindowRef.current.openEditorWindow({
                                  showSubject: false,
                                  text: note.note,
                                  onPrimaryClick: data => {
                                    if (socket) {
                                      socket.emit(TICKETS_COMMENT_NOTE_SET, {
                                        _id: ticket._id,
                                        item: note._id,
                                        isNote: note.isNote,
                                        value: data.text
                                      })
                                    }
                                  }
                                })
                              }}
                              onRemoveClick={() => {
                                if (socket) {
                                  socket.emit(TICKETS_COMMENT_NOTE_REMOVE, {
                                    _id: ticket._id,
                                    value: note._id,
                                    isNote: note.isNote
                                  })
                                }
                              }}
                            />
                          ))}
                      </div>
                    </TruTabSection>
                  </TruTabWrapper>
                )}

                {/* Comment / Notes Form */}
                {ticket.status.isResolved === false &&
                  (helpers.canUser('comments:create', true) || helpers.canUser('tickets:notes', true)) && (
                    <div className='uk-width-1-1 ticket-reply uk-clearfix'>
                      <Avatar image={shared.sessionUser.image} showOnlineBubble={false} />
                      <TruTabWrapper style={{ paddingLeft: 85 }}>
                        <TruTabSelectors showTrack={false}>
                          {helpers.canUser('comments:create', true) && (
                            <TruTabSelector selectorId={0} label={t('common.comment')} active />
                          )}
                          {helpers.canUser('tickets:notes', true) && (
                            <TruTabSelector
                              selectorId={1}
                              label={t('tickets.internalNote')}
                              active={!helpers.canUser('comments:create', true)}
                            />
                          )}
                        </TruTabSelectors>
                        <TruTabSection
                          sectionId={0}
                          style={{ paddingTop: 0 }}
                          active={helpers.canUser('comments:create', true)}
                        >
                          <form onSubmit={e => onCommentNoteSubmit(e, 'comment')}>
                            <EasyMDE
                              allowImageUpload
                              inlineImageUploadUrl='/tickets/uploadmdeimage'
                              inlineImageUploadHeaders={{ ticketid: ticket._id }}
                              ref={commentMDERef}
                            />
                            <div className='uk-width-1-1 uk-clearfix' style={{ marginTop: 50 }}>
                              <div className='uk-float-right'>
                                <button
                                  type='submit'
                                  className='uk-button uk-button-accent'
                                  style={{ padding: '10px 15px' }}
                                >
                                  {t('tickets.postComment')}
                                </button>
                              </div>
                            </div>
                          </form>
                        </TruTabSection>
                        <TruTabSection
                          sectionId={1}
                          style={{ paddingTop: 0 }}
                          active={!helpers.canUser('comments:create') && helpers.canUser('tickets:notes', true)}
                        >
                          <form onSubmit={e => onCommentNoteSubmit(e, 'note')}>
                            <EasyMDE
                              allowImageUpload
                              inlineImageUploadUrl='/tickets/uploadmdeimage'
                              inlineImageUploadHeaders={{ ticketid: ticket._id }}
                              ref={noteMDERef}
                            />
                            <div className='uk-width-1-1 uk-clearfix' style={{ marginTop: 50 }}>
                              <div className='uk-float-right'>
                                <button
                                  type='submit'
                                  className='uk-button uk-button-accent'
                                  style={{ padding: '10px 15px' }}
                                >
                                  {t('tickets.saveNote')}
                                </button>
                              </div>
                            </div>
                          </form>
                        </TruTabSection>
                      </TruTabWrapper>
                    </div>
                )}
              </div>
            </div>
          </div>
          <OffCanvasEditor primaryLabel={t('tickets.saveEdit')} ref={editorWindowRef} />
        </>
      )}
    </div>
  )
}

SingleTicketContainer.propTypes = {
  ticketId: PropTypes.string.isRequired,
  ticketUid: PropTypes.string.isRequired,
  shared: PropTypes.object.isRequired,
  sessionUser: PropTypes.object,
  socket: PropTypes.object.isRequired,
  common: PropTypes.object.isRequired,
  ticketTypes: PropTypes.object.isRequired,
  fetchTicketTypes: PropTypes.func.isRequired,
  groupsState: PropTypes.object.isRequired,
  fetchGroups: PropTypes.func.isRequired,
  unloadGroups: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  transferToThirdParty: PropTypes.func,
  ticketStatuses: PropTypes.object.isRequired,
  fetchTicketStatus: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  common: state.common.viewdata,
  shared: state.shared,
  sessionUser: state.shared.sessionUser,
  socket: state.shared.socket,
  ticketTypes: state.ticketsState.types,
  ticketStatuses: state.ticketsState.ticketStatuses,
  groupsState: state.groupsState
})

export default withTranslation()(connect(mapStateToProps, {
  fetchTicketTypes,
  fetchGroups,
  fetchTicketStatus,
  unloadGroups,
  showModal,
  transferToThirdParty
})(SingleTicketContainer))
