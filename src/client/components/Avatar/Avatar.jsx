/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/22/19 12:54 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { Fragment, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { some } from 'lodash'
import clsx from 'clsx'

import axios from 'axios'

import { ACCOUNTS_UI_PROFILE_IMAGE_UPDATE, UI_ONLINE_STATUS_UPDATE } from 'serverSocket/socketEventConsts'

import helpers from 'lib/helpers'

const Avatar = ({
  userId,
  username,
  socket,
  image,
  size = 50,
  showOnlineBubble = true,
  showBorder = false,
  borderColor,
  enableImageUpload = false,
  style,
  overrideBubbleSize,
  showLargerBubble = false
}) => {
  const onlineBubbleRef = useRef(null)
  const overlayRef = useRef(null)
  const imageUploadInput = useRef(null)

  const onOnlineStatusUpdate = useCallback(
    data => {
      if (onlineBubbleRef.current && userId) {
        const bubble = onlineBubbleRef.current
        bubble.classList.remove('user-online')
        bubble.classList.remove('user-idle')
        bubble.classList.add('user-offline')

        const onlineUserList = data.sortedUserList
        const idleUserList = data.sortedIdleList

        const isOnline = some(onlineUserList, val => val.user._id.toString() === userId.toString())
        const isIdle = some(idleUserList, val => val.user._id.toString() === userId.toString())

        if (isIdle) {
          bubble.classList.remove('user-offline')
          bubble.classList.remove('user-online')
          bubble.classList.add('user-idle')
        } else if (isOnline) {
          bubble.classList.remove('user-offline')
          bubble.classList.remove('user-idle')
          bubble.classList.add('user-online')
        }
      }
    },
    [userId]
  )

  // Mount: bind socket event if showOnlineBubble and userId are present
  useEffect(() => {
    if (!socket) return
    if (showOnlineBubble && userId) {
      socket.on(UI_ONLINE_STATUS_UPDATE, onOnlineStatusUpdate)
    }

    return () => {
      socket.off(UI_ONLINE_STATUS_UPDATE, onOnlineStatusUpdate)
    }
  }, [showOnlineBubble, userId, socket, onOnlineStatusUpdate])

  const onMouseOver = useCallback(() => {
    if (overlayRef.current && overlayRef.current.classList.contains('uk-hidden')) {
      overlayRef.current.classList.remove('uk-hidden')
    }
  }, [])

  const onMouseOut = useCallback(() => {
    if (overlayRef.current && !overlayRef.current.classList.contains('uk-hidden'))
      overlayRef.current.classList.add('uk-hidden')
  }, [])

  const onUploadImageClicked = useCallback(e => {
    e.preventDefault()
    if (imageUploadInput.current) {
      imageUploadInput.current.click('click')
    }
  }, [])

  const onImageInputChange = useCallback(
    e => {
      e.preventDefault()
      if (imageUploadInput.current.value === '') return
      const formData = new FormData()
      const imageFile = e.target.files[0]
      formData.append('_id', userId)
      formData.append('username', username)
      formData.append('image', imageFile)
      axios
        .post('/accounts/uploadImage', formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        })
        .then(res => {
          if (socket) socket.emit(ACCOUNTS_UI_PROFILE_IMAGE_UPDATE, { _id: userId })

          imageUploadInput.current.value = ''
        })
        .catch(error => {
          console.error(error)
          helpers.UI.showSnackbar(`Error: ${error.message}`, true)
        })
    },
    [userId, username, socket]
  )

  let wrapperStyle = { borderRadius: '50%' }
  if (showBorder) {
    wrapperStyle.borderWidth = 4
    wrapperStyle.borderStyle = 'solid'
    wrapperStyle.borderColor = 'rgba(0,0,0,0.1)'
  }
  if (borderColor) wrapperStyle.borderColor = borderColor

  if (style) wrapperStyle = { ...wrapperStyle, ...style }

  let bubbleSize = size < 50 ? Math.round(size / 2) : 17
  if (overrideBubbleSize) bubbleSize = overrideBubbleSize
  if (showLargerBubble) bubbleSize = 25

  return (
    <Fragment>
      <div
        className='relative uk-clearfix uk-float-left uk-display-inline-block'
        style={wrapperStyle}
        onMouseOver={onMouseOver}
        onMouseOut={onMouseOut}
      >
        {enableImageUpload && (
          <>
            <form>
              <input
                ref={imageUploadInput}
                className={'uk-hidden'}
                type='file'
                hidden={true}
                accept={'image/*'}
                onChange={onImageInputChange}
              />
            </form>
            <div
              ref={overlayRef}
              className={'uk-hidden'}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignContent: 'center',
                alignItems: 'center',
                justifyContent: 'center',
                height: size,
                width: size,
                background: 'rgba(0,0,0,0.2)',
                borderRadius: '50%',
                cursor: 'pointer',
                zIndex: 100
              }}
              onClick={onUploadImageClicked}
            >
              <i className={'material-icons'} style={{ color: '#fff' }}>
                edit
              </i>
            </div>
          </>
        )}
        <img
          className='profile-pic uk-border-circle'
          style={{ height: size, width: size }}
          src={`/uploads/users/${image || 'defaultProfile.jpg'}`}
          alt=''
        />
        {showOnlineBubble && (
          <span
            ref={onlineBubbleRef}
            className={clsx(
              'user-online-status',
              showLargerBubble && 'user-status-large',
              'user-offline',
              'uk-border-circle'
            )}
            style={{ height: bubbleSize, width: bubbleSize }}
          />
        )}
      </div>
    </Fragment>
  )
}

Avatar.propTypes = {
  userId: PropTypes.string,
  username: PropTypes.string, // Required if using enableImageUpload
  socket: PropTypes.object.isRequired,
  image: PropTypes.string,
  size: PropTypes.number.isRequired,
  showOnlineBubble: PropTypes.bool,
  showBorder: PropTypes.bool,
  borderColor: PropTypes.string,
  enableImageUpload: PropTypes.bool,
  style: PropTypes.object,
  overrideBubbleSize: PropTypes.number,
  showLargerBubble: PropTypes.bool
}

const mapStateToProps = state => ({
  socket: state.shared.socket
})

export default connect(mapStateToProps, {})(Avatar)
