import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { PopoverColorPicker } from 'components/PopoverColorPicker'
import Button from 'components/Button'
import BaseModal from 'containers/Modals/BaseModal'

import { createNotice } from 'actions/notices'

import helpers from 'lib/helpers'
import $ from 'jquery'

function CreateNoticeModal (props) {
  const { t } = props

  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [color, setColor] = useState('#4CAF50')
  const [fontColor, setFontColor] = useState('#ffffff')

  useEffect(() => {
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
      name,
      message,
      color,
      fontColor
    }

    props.createNotice(payload).then(() => {
      helpers.resizeAll()
    })
  }, [name, message, color, fontColor])

  return (
    <BaseModal {...props} options={{ bgclose: false }}>
      <div className='mb-25'>
        <h2>{t('modals.createNotice.title')}</h2>
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
          <Button text={t('modals.createNotice.createButton')} flat waves style='primary' type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

CreateNoticeModal.propTypes = {
  createNotice: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({})

export default withTranslation()(connect(mapStateToProps, { createNotice })(CreateNoticeModal))
