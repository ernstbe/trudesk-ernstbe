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
import { createStatus } from 'actions/tickets'
import BaseModal from './BaseModal'
import Button from 'components/Button'
import ColorSelector from 'components/ColorSelector'

import $ from 'jquery'
import helpers from 'lib/helpers'
import EnableSwitch from 'components/Settings/EnableSwitch'

function CreateStatusModal (props) {
  const { t } = props
  const [name, setName] = useState('')
  const [htmlColor, setHtmlColor] = useState('#29B995')
  const [slatimer, setSlatimer] = useState(true)
  const [isResolved, setIsResolved] = useState(false)

  useEffect(() => {
    helpers.UI.inputs()
    helpers.formvalidator()
  }, [])

  const onCreateStatusSubmit = useCallback((e) => {
    e.preventDefault()
    const $form = $(e.target)
    if (!$form.isValid(null, null, false)) return true

    //  Form is valid... Submit..
    props.createStatus({
      name,
      htmlColor,
      slatimer,
      isResolved
    })
  }, [name, htmlColor, slatimer, isResolved])

  return (
    <BaseModal {...props} large>
      <form className='uk-form-stacked' onSubmit={e => onCreateStatusSubmit(e)}>
        <div className='uk-margin-medium-bottom uk-clearfix'>
          <h2>{t('modals.createStatus.title')}</h2>
        </div>

        <div>
          <div className='uk-clearfix'>
            <div className='z-box uk-grid uk-grid-collpase uk-clearfix'>
              <div className='uk-width-1-4'>
                <label>{t('modals.createStatus.statusName')}</label>
                <input
                  type='text'
                  className='md-input'
                  value={name}
                  onChange={e => setName(e.target.value)}
                  data-validation='length'
                  data-validation-length='min3'
                  data-validation-error-msg={t('modals.createStatus.validName')}
                />
              </div>

              <div className='uk-width-1-4'>
                <ColorSelector
                  hideRevert
                  defaultColor='#29B995'
                  validationEnabled
                  onChange={e => setHtmlColor(e.target.value)}
                />
              </div>
              <div className='uk-width-1-4'>
                <div className='uk-float-left'>
                  <EnableSwitch
                    stateName='slatimer'
                    label={t('modals.createStatus.sla')}
                    checked={slatimer}
                    onChange={e => setSlatimer(e.target.checked)}
                  />
                </div>
                <div className='uk-float-left'>
                  <EnableSwitch
                    stateName='isResolved'
                    label={t('modals.createStatus.isResolved')}
                    checked={isResolved}
                    onChange={e => setIsResolved(e.target.checked)}
                  />
                </div>
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

CreateStatusModal.propTypes = {
  createStatus: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

export default withTranslation()(connect(null, { createStatus })(CreateStatusModal))
