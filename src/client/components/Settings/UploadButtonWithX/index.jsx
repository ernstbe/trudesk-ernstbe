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
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

import $ from 'jquery'
import UIkit from 'uikit'
import helpers from 'lib/helpers'

const UploadButtonWithX = ({ buttonText, uploadAction, extAllowed, showX, onXClick }) => {
  const buttonXRef = useRef(null)
  const uploadButtonRef = useRef(null)
  const uploadSelectRef = useRef(null)

  useEffect(() => {
    const $uploadButton = $(uploadButtonRef.current)
    const $buttonX = $(buttonXRef.current)
    const $uploadSelect = $(uploadSelectRef.current)

    const uploadLogoSettings = {
      action: uploadAction,
      allow: extAllowed,
      loadstart: function () {
        $uploadButton.text('Uploading...')
        $uploadButton.attr('disabled', true)
        $uploadButton.addClass('disable')
      },
      allcomplete: function () {
        $uploadButton.text('Upload Logo')
        $uploadButton.attr('disabled', false)
        $uploadButton.removeClass('disable')
        helpers.UI.showSnackbar('Upload Complete. Reloading...', false)
        // remove page refresh once SettingsService merge
        // $('img.site-logo').attr('src', '/assets/topLogo.png?refresh=' + new Date().getTime());
        setTimeout(function () {
          window.location.reload()
        }, 1000)
        $buttonX.removeClass('hide')
      }
    }

    UIkit.uploadSelect($uploadSelect, uploadLogoSettings)
  }, [])

  return (
    <div>
      <button
        ref={buttonXRef}
        className={`md-btn md-btn-danger md-btn-small right ${showX ? '' : 'hide'}`}
        onClick={onXClick}
        style={{ marginTop: '8px' }}
      >
        X
      </button>
      <button
        ref={uploadButtonRef}
        className='uk-form-file md-btn md-btn-small right'
        style={{ marginTop: '8px', textTransform: 'none' }}
      >
        {buttonText}
        <input
          ref={uploadSelectRef}
          type='file'
        />
      </button>
    </div>
  )
}

UploadButtonWithX.propTypes = {
  buttonText: PropTypes.string.isRequired,
  uploadAction: PropTypes.string.isRequired,
  extAllowed: PropTypes.string.isRequired,
  showX: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  onXClick: PropTypes.func
}

export default UploadButtonWithX
