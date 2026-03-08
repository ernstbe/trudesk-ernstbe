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
 *  Updated:    2/18/22 10:06 PM
 *  Copyright (c) 2014-2022. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import helpers from 'lib/helpers'
import { updateNotice } from 'actions/notices'

import BaseModal from 'containers/Modals/BaseModal'
import { PopoverColorPicker } from 'components/PopoverColorPicker'
import Button from 'components/Button'
import $ from 'jquery'

function EditNoticeModal (props) {
  const { t, notice } = props

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [color, setColor] = useState('')
  const [fontColor, setFontColor] = useState('')

  useEffect(() => {
    setName(notice.name)
    setMessage(notice.message)
    setColor(notice.color)
    setFontColor(notice.fontColor)

    helpers.UI.inputs()
    helpers.UI.reRenderInputs()
    helpers.formvalidator()
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()
  })

  const onInputChange = useCallback((target, e) => {
    if (target === 'name') setName(e.target.value)
    else if (target === 'message') setMessage(e.target.value)
  }, [])

  const onFormSubmit = useCallback((e) => {
    e.preventDefault()
    const $form = $(e.target)
    if (!$form.isValid(null, null, false)) return false

    const payload = {
      _id: notice._id,
      name,
      message,
      color,
      fontColor
    }

    props.updateNotice(payload)
  }, [name, message, color, fontColor, notice._id])

  return (
    <BaseModal {...props} options={{ bgclose: false }}>
      <div className='mb-25'>
        <h2>{t('modals.editNotice.title')}</h2>
      </div>
      <form className='uk-form-stacked' onSubmit={e => onFormSubmit(e)}>
        <div className='uk-margin-medium-bottom'>
          <label>{t('common.name')}</label>
          <input
            type='text'
            className='md-input'
            value={name}
            onChange={e => onInputChange('name', e)}
            data-validation='length'
            data-validation-length='min2'
            data-validation-error-msg={t('modals.createNotice.validName')}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <label>{t('modals.createNotice.message')}</label>
          <textarea
            className='md-input'
            value={message}
            onChange={e => onInputChange('message', e)}
            data-validation='length'
            data-validation-length='min10'
            data-validation-error-msg={t('modals.createNotice.validMessage')}
          />
        </div>
        <div>
          <span style={{ display: 'inline-block', float: 'left', paddingTop: 5 }}>{t('modals.createNotice.backgroundColor')}</span>
          <PopoverColorPicker
            color={color}
            onChange={c => {
              setColor(c)
            }}
            style={{ float: 'left', marginLeft: 5, marginRight: 15 }}
          />
          <span style={{ display: 'inline-block', float: 'left', paddingTop: 5 }}>{t('modals.createNotice.fontColor')}</span>
          <PopoverColorPicker
            color={fontColor}
            onChange={c => {
              setFontColor(c)
            }}
            style={{ float: 'left', marginLeft: 5 }}
          />
        </div>

        <div className='uk-modal-footer uk-text-right'>
          <Button text={t('common.close')} flat waves extraClass='uk-modal-close' />
          <Button text={t('modals.editNotice.saveButton')} flat waves style='primary' type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

EditNoticeModal.propTypes = {
  notice: PropTypes.object.isRequired,
  updateNotice: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({})

export default withTranslation()(connect(mapStateToProps, { updateNotice })(EditNoticeModal))
