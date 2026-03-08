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
 *  Updated:    2/3/19 8:28 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { createTicketType } from 'actions/tickets'
import BaseModal from './BaseModal'
import Button from 'components/Button'

import $ from 'jquery'
import helpers from 'lib/helpers'

function CreateTicketTypeModal (props) {
  const { t } = props
  const [typeName, setTypeName] = useState('')

  useEffect(() => {
    helpers.UI.inputs()
    helpers.formvalidator()
  }, [])

  const onTypeNameChanged = useCallback((e) => {
    setTypeName(e.target.value)
  }, [])

  const onCreateTicketTypeSubmit = useCallback((e) => {
    e.preventDefault()
    const $form = $(e.target)
    if (!$form.isValid(null, null, false)) return true

    //  Form is valid... Submit..
    props.createTicketType({ name: typeName })
  }, [typeName])

  return (
    <BaseModal {...props}>
      <form className='uk-form-stacked' onSubmit={e => onCreateTicketTypeSubmit(e)}>
        <div>
          <h2 className='nomargin mb-5'>{t('modals.createTicketType.title')}</h2>
          <p className='uk-text-small uk-text-muted'>{t('modals.createTicketType.title')}</p>
          <label htmlFor='typeName'>{t('modals.createTicketType.typeName')}</label>
          <input
            value={typeName}
            onChange={e => onTypeNameChanged(e)}
            type='text'
            className='md-input'
            name='typeName'
            data-validation='length'
            data-validation-length='min3'
            data-validation-error-msg={t('modals.createTicketType.validName')}
          />
        </div>
        <div className='uk-modal-footer uk-text-right'>
          <Button text={t('common.close')} flat waves extraClass='uk-modal-close' />
          <Button text={t('common.create')} style='success' type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

CreateTicketTypeModal.propTypes = {
  onTypeCreated: PropTypes.func,
  createTicketType: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

export default withTranslation()(connect(
  null,
  { createTicketType }
)(CreateTicketTypeModal))
