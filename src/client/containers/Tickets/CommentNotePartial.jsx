/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/22/19 4:14 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { Fragment, useEffect, useRef } from 'react'
import PropTypes from 'prop-types'
import parse from 'html-react-parser'
import Avatar from 'components/Avatar/Avatar'

import helpers from 'lib/helpers'

const setupImages = bodyEl => {
  const imagesEl = bodyEl.querySelectorAll('img:not(.hasLinked)')
  imagesEl.forEach(i => helpers.setupImageLink(i))
}

const setupLinks = bodyEl => {
  const linksEl = bodyEl.querySelectorAll('a')
  linksEl.forEach(i => helpers.setupLinkWarning(i))
}

function CommentNotePartial ({
  ticketStatus,
  ticketSubject,
  comment,
  dateFormat,
  isNote = false,
  onEditClick,
  onRemoveClick
}) {
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) {
      setupImages(bodyRef.current)
      setupLinks(bodyRef.current)
    }
  })

  const dateFormatted = helpers.formatDate(comment.date, dateFormat)
  return (
    <div className='ticket-comment'>
      <Avatar image={comment.owner.image} userId={comment.owner._id} />
      <div className='issue-text'>
        <h3>Re: {ticketSubject}</h3>
        <a className='comment-email-link' href={`mailto:${comment.owner.email}`}>
          {comment.owner.fullname} &lt;{comment.owner.email}&gt;
        </a>
        <br />
        <time dateTime={dateFormatted} title={dateFormatted} data-uk-tooltip='{delay: 200}'>
          {helpers.calendarDate(comment.date)}
        </time>

        <br />
        {isNote && <span className='uk-badge uk-badge-small nomargin-left-right text-white'>NOTE</span>}

        <div className='comment-body' style={{ marginTop: 10 }} ref={bodyRef}>
          {isNote && <>{parse(comment.note)}</>}
          {!isNote && <>{parse(comment.comment)}</>}
        </div>
      </div>
      {ticketStatus.get('isResolved') === false && (
        <div className='comment-actions'>
          {helpers.hasPermOverRole(comment.owner.role, null, 'comments:delete', true) && (
            <div className='remove-comment' onClick={onRemoveClick}>
              <i className='material-icons'>&#xE5CD;</i>
            </div>
          )}
          {helpers.hasPermOverRole(comment.owner.role, null, 'comments:update', true) && (
            <div className='edit-comment' onClick={onEditClick}>
              <i className='material-icons'>&#xE254;</i>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

CommentNotePartial.propTypes = {
  ticketStatus: PropTypes.object.isRequired,
  ticketSubject: PropTypes.string.isRequired,
  comment: PropTypes.object.isRequired,
  dateFormat: PropTypes.string.isRequired,
  isNote: PropTypes.bool.isRequired,
  onEditClick: PropTypes.func.isRequired,
  onRemoveClick: PropTypes.func.isRequired
}

export default CommentNotePartial
