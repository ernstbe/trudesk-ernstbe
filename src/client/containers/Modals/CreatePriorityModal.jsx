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
 *  Updated:    2/4/19 1:47 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { createPriority } from 'actions/tickets'
import BaseModal from './BaseModal'
import Button from 'components/Button'
import ColorSelector from 'components/ColorSelector'

import $ from 'jquery'
import helpers from 'lib/helpers'

function CreatePriorityModal (props) {
  const { t } = props
  const [name, setName] = useState('')
  const [overdueIn, setOverdueIn] = useState(2880)
  const [htmlColor, setHtmlColor] = useState('#29B995')

  useEffect(() => {
    helpers.UI.inputs()
    helpers.formvalidator()
  }, [])

  const onCreatePrioritySubmit = useCallback((e) => {
    e.preventDefault()
    const $form = $(e.target)
    if (!$form.isValid(null, null, false)) return true

    //  Form is valid... Submit..
    props.createPriority({
      name,
      overdueIn,
      htmlColor
    })
  }, [name, overdueIn, htmlColor])

  return (
    <BaseModal {...props}>
      <form className='uk-form-stacked' onSubmit={e => onCreatePrioritySubmit(e)}>
        <div className='uk-margin-medium-bottom uk-clearfix'>
          <h2>{t('modals.createPriority.title')}</h2>
        </div>

        <div>
          <div className='uk-clearfix'>
            <div className='z-box uk-grid uk-grid-collpase uk-clearfix'>
              <div className='uk-width-1-3'>
                <label>{t('modals.createPriority.priorityName')}</label>
                <input
                  type='text'
                  className='md-input'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  data-validation='length'
                  data-validation-length='min3'
                  data-validation-error-msg={t('modals.createPriority.validName')}
                />
              </div>
              <div className='uk-width-1-3'>
                <label>{t('modals.createPriority.slaOverdue')}</label>
                <input
                  type='text'
                  className='md-input'
                  value={overdueIn}
                  onChange={e => setOverdueIn(e.target.value)}
                  data-validation='number'
                  data-validation-allowing='range[1;525600]'
                  data-validation-error-msg={t('modals.createPriority.validSla')}
                />
              </div>
              <div className='uk-width-1-3'>
                <ColorSelector
                  hideRevert
                  defaultColor='#29B995'
                  validationEnabled
                  onChange={e => setHtmlColor(e.target.value)}
                />
              </div>
            </div>
            <div className='uk-modal-footer uk-text-right'>
              <Button text={t('common.cancel')} type='button' extraClass='uk-modal-close' flat waves />
              <Button text={t('common.create')} type='submit' flat waves style='success' />
            </div>
          </div>
        </div>
      </form>
    </BaseModal>
  )
}

CreatePriorityModal.propTypes = {
  onPriorityCreated: PropTypes.func,
  createPriority: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

export default withTranslation()(connect(null, { createPriority })(CreatePriorityModal))
