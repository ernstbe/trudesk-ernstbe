/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/24/19 5:32 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { Fragment, useEffect, useState, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'

import Avatar from 'components/Avatar/Avatar'
import parse from 'html-react-parser'

import { TICKETS_ISSUE_SET, TICKETS_UI_ATTACHMENTS_UPDATE } from 'serverSocket/socketEventConsts'

import helpers from 'lib/helpers'
import axios from 'axios'
import Log from '../../logger'

const setupImages = issueBodyEl => {
  const imagesEl = issueBodyEl.querySelectorAll('img:not(.hasLinked)')
  imagesEl.forEach(i => helpers.setupImageLink(i))
}

const setupLinks = issueBodyEl => {
  const linksEl = issueBodyEl.querySelectorAll('a')
  linksEl.forEach(i => helpers.setupLinkWarning(i))
}

function IssuePartial (props) {
  const { ticketId, status, owner, subject, issue, date, dateFormat, attachments: attachmentsProp, editorWindow, socket } = props

  const [attachments, setAttachments] = useState(attachmentsProp || [])
  const issueBodyRef = useRef(null)
  const attachmentInputRef = useRef(null)

  useEffect(() => {
    setAttachments(attachmentsProp || [])
  }, [attachmentsProp])

  useEffect(() => {
    if (issueBodyRef.current) {
      setupImages(issueBodyRef.current)
      setupLinks(issueBodyRef.current)
    }
  })

  const onUpdateTicketAttachments = useCallback(
    data => {
      if (ticketId === data.ticket._id) {
        setAttachments(data.ticket.attachments)
      }
    },
    [ticketId]
  )

  useEffect(() => {
    if (!socket) return
    socket.on(TICKETS_UI_ATTACHMENTS_UPDATE, onUpdateTicketAttachments)
    return () => {
      socket.off(TICKETS_UI_ATTACHMENTS_UPDATE, onUpdateTicketAttachments)
    }
  }, [socket, onUpdateTicketAttachments])

  const onAttachmentInputChange = useCallback(
    e => {
      const formData = new FormData()
      const attachmentFile = e.target.files[0]
      formData.append('ticketId', ticketId)
      formData.append('attachment', attachmentFile)
      const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content')
      axios
        .post('/tickets/uploadattachment', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            'CSRF-TOKEN': token
          }
        })
        .then(() => {
          if (socket) socket.emit(TICKETS_UI_ATTACHMENTS_UPDATE, { _id: ticketId })
          helpers.UI.showSnackbar('Attachment Successfully Uploaded')
        })
        .catch(error => {
          Log.error(error)
          if (error.response) Log.error(error.response)
          helpers.UI.showSnackbar(error, true)
        })
    },
    [ticketId, socket]
  )

  const removeAttachment = useCallback(
    (e, attachmentId) => {
      axios
        .delete(`/api/v1/tickets/${ticketId}/attachments/remove/${attachmentId}`)
        .then(() => {
          if (socket) socket.emit(TICKETS_UI_ATTACHMENTS_UPDATE, { _id: ticketId })
          helpers.UI.showSnackbar('Attachment Removed')
        })
        .catch(error => {
          Log.error(error)
          if (error.response) Log.error(error.response)
          helpers.UI.showSnackbar(error, true)
        })
    },
    [ticketId, socket]
  )

  return (
    <div className='initial-issue uk-clearfix'>
      <Avatar image={owner.image} userId={owner._id} />
      {/* Issue */}
      <div className='issue-text'>
        <h3 className='subject-text'>{subject}</h3>
        <a href={`mailto:${owner.email}`}>
          {owner.fullname} &lt;{owner.email}&gt;
        </a>
        <br />
        <time dateTime={helpers.formatDate(date, 'YYYY-MM-DD HH:mm')}>
          {helpers.formatDate(date, dateFormat)}
        </time>
        <br />
        {/* Attachments */}
        <ul className='attachments'>
          {attachments &&
            attachments.map(attachment => (
              <li key={attachment._id}>
                <a href={attachment.path} className='no-ajaxy' rel='noopener noreferrer' target='_blank'>
                  {attachment.name}
                </a>
                {status.get('isResolved') === false && (
                  <a
                    role='button'
                    className='remove-attachment'
                    onClick={e => removeAttachment(e, attachment._id)}
                  >
                    <i className='fa fa-remove' />
                  </a>
                )}
              </li>
            ))}
        </ul>
        <div className='issue-body' ref={issueBodyRef}>
          {parse(issue)}
        </div>
      </div>
      {/* Permissions on Fragment for edit */}
      {status.get('isResolved') === false &&
        helpers.hasPermOverRole(owner.role, null, 'tickets:update', true) && (
          <>
            <div
              className='edit-issue'
              onClick={() => {
                if (editorWindow) {
                  editorWindow.openEditorWindow({
                    subject,
                    text: issue,
                    onPrimaryClick: data => {
                      if (socket) {
                        socket.emit(TICKETS_ISSUE_SET, {
                          _id: ticketId,
                          value: data.text,
                          subject: data.subjectText
                        })
                      }
                    }
                  })
                }
              }}
            >
              <i className='material-icons'>&#xE254;</i>
            </div>
            <form className='form nomargin' encType='multipart/form-data'>
              <div className='add-attachment' onClick={e => attachmentInputRef.current.click()}>
                <i className='material-icons'>&#xE226;</i>
              </div>

              <input
                ref={attachmentInputRef}
                className='hide'
                type='file'
                onChange={e => onAttachmentInputChange(e)}
              />
            </form>
          </>
      )}
    </div>
  )
}

IssuePartial.propTypes = {
  ticketId: PropTypes.string.isRequired,
  status: PropTypes.object.isRequired,
  owner: PropTypes.object.isRequired,
  subject: PropTypes.string.isRequired,
  issue: PropTypes.string.isRequired,
  date: PropTypes.string.isRequired,
  dateFormat: PropTypes.string.isRequired,
  attachments: PropTypes.array,
  editorWindow: PropTypes.object,
  socket: PropTypes.object.isRequired
}

export default IssuePartial
