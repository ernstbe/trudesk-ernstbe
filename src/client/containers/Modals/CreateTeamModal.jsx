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
 *  Updated:    3/28/19 2:07 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import { fetchAccounts, unloadAccounts } from 'actions/accounts'
import { createTeam } from 'actions/teams'

import BaseModal from 'containers/Modals/BaseModal'

import helpers from 'lib/helpers'
import $ from 'jquery'
import Button from 'components/Button'
import MultiSelect from 'components/MultiSelect'

function CreateTeamModal (props) {
  const { t } = props
  const [name, setName] = useState('')
  const membersSelectRef = useRef(null)

  useEffect(() => {
    props.fetchAccounts({ limit: -1 })

    helpers.UI.inputs()
    helpers.UI.reRenderInputs()
    helpers.formvalidator()

    return () => {
      props.unloadAccounts()
    }
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()
  })

  const onInputChange = useCallback((e) => {
    setName(e.target.value)
  }, [])

  const onFormSubmit = useCallback((e) => {
    e.preventDefault()
    const $form = $(e.target)
    if (!$form.isValid(null, null, false)) return false

    const payload = {
      name,
      members: membersSelectRef.current.getSelected()
    }

    props.createTeam(payload)
  }, [name])

  const mappedAccounts = props.accounts
    .filter(account => {
      return account.getIn(['role', 'isAgent']) === true && !account.get('deleted')
    })
    .map(account => {
      return { text: account.get('fullname'), value: account.get('_id') }
    })
    .toArray()

  return (
    <BaseModal {...props} options={{ bgclose: false }}>
      <div className='mb-25'>
        <h2>{t('modals.createTeam.title')}</h2>
      </div>
      <form className='uk-form-stacked' onSubmit={e => onFormSubmit(e)}>
        <div className='uk-margin-medium-bottom'>
          <label>{t('modals.createTeam.teamName')}</label>
          <input
            type='text'
            className='md-input'
            value={name}
            onChange={e => onInputChange(e)}
            data-validation='length'
            data-validation-length='min2'
            data-validation-error-msg={t('modals.createTeam.validName')}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <label style={{ marginBottom: 5 }}>{t('modals.createTeam.teamMembers')}</label>
          <MultiSelect items={mappedAccounts} onChange={() => {}} ref={r => (membersSelectRef.current = r)} />
        </div>
        <div className='uk-modal-footer uk-text-right'>
          <Button text={t('common.close')} flat waves extraClass='uk-modal-close' />
          <Button text={t('modals.createTeam.createButton')} flat waves style='primary' type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

CreateTeamModal.propTypes = {
  fetchAccounts: PropTypes.func.isRequired,
  unloadAccounts: PropTypes.func.isRequired,
  accounts: PropTypes.object.isRequired,
  createTeam: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  accounts: state.accountsState.accounts
})

export default withTranslation()(connect(mapStateToProps, { fetchAccounts, unloadAccounts, createTeam })(CreateTeamModal))
