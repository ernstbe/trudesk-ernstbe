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
 *  Updated:    4/12/19 12:21 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import { fetchAccounts, unloadAccounts } from 'actions/accounts'
import { createGroup } from 'actions/groups'

import BaseModal from 'containers/Modals/BaseModal'
import MultiSelect from 'components/MultiSelect'
import Button from 'components/Button'

import helpers from 'lib/helpers'
import $ from 'jquery'

function CreateGroupModal (props) {
  const { t } = props
  const [name, setName] = useState('')
  const membersSelectRef = useRef(null)

  useEffect(() => {
    props.fetchAccounts({ type: 'customers' })

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

    const postData = {
      name,
      members: membersSelectRef.current.getSelected() || []
    }

    props.createGroup(postData)
  }, [name])

  const mappedAccounts = props.accounts
    .map(account => {
      return { text: account.get('fullname'), value: account.get('_id') }
    })
    .toArray()
  return (
    <BaseModal>
      <div className='mb-25'>
        <h2>{t('modals.createGroup.title')}</h2>
      </div>
      <form className='uk-form-stacked' onSubmit={e => onFormSubmit(e)}>
        <div className='uk-margin-medium-bottom'>
          <label>{t('modals.createGroup.groupName')}</label>
          <input
            type='text'
            className='md-input'
            value={name}
            onChange={e => onInputChange(e)}
            data-validation='length'
            data-validation-length='min2'
            data-validation-error-msg={t('modals.createGroup.validName')}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <label style={{ marginBottom: 5 }}>{t('modals.createGroup.groupMembers')}</label>
          <MultiSelect items={mappedAccounts} onChange={() => {}} ref={r => (membersSelectRef.current = r)} />
        </div>
        <div className='uk-modal-footer uk-text-right'>
          <Button text={t('common.close')} flat waves extraClass='uk-modal-close' />
          <Button text={t('modals.createGroup.createButton')} flat waves style='primary' type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

CreateGroupModal.propTypes = {
  accounts: PropTypes.object.isRequired,
  fetchAccounts: PropTypes.func.isRequired,
  unloadAccounts: PropTypes.func.isRequired,
  createGroup: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  accounts: state.accountsState.accounts
})

export default withTranslation()(connect(mapStateToProps, { createGroup, fetchAccounts, unloadAccounts })(CreateGroupModal))
