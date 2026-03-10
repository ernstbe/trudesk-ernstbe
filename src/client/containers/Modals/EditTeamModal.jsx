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
 *  Updated:    3/27/19 11:41 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import { fetchAccounts, unloadAccounts } from 'actions/accounts'
import { saveEditTeam } from 'actions/teams'

import BaseModal from 'containers/Modals/BaseModal'

import helpers from 'lib/helpers'
import Button from 'components/Button'
import MultiSelect from 'components/MultiSelect'
import $ from 'jquery'
import SpinLoader from 'components/SpinLoader'

function EditTeamModal (props) {
  const { t, team } = props
  const [name, setName] = useState('')
  const membersSelectRef = useRef(null)

  useEffect(() => {
    props.fetchAccounts({ type: 'all', limit: -1 })
    setName(team.name)

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

  const onSaveTeamEdit = useCallback((e) => {
    e.preventDefault()
    const $form = $(e.target)
    if (!$form.isValid(null, null, false)) return false

    const payload = {
      _id: team._id,
      name,
      members: membersSelectRef.current.getSelected() || []
    }

    props.saveEditTeam(payload)
  }, [name, team._id])

  const mappedAccounts = props.accounts
    .filter(account => {
      return account.getIn(['role', 'isAgent']) === true && !account.get('deleted')
    })
    .map(account => {
      return { text: account.get('fullname'), value: account.get('_id') }
    })
    .toArray()

  const selectedMembers = team.members

  return (
    <BaseModal {...props} options={{ bgclose: false }}>
      <SpinLoader active={props.accountsLoading} />
      <div className='mb-25'>
        <h2>{t('modals.editTeam.title')}</h2>
      </div>
      <form className='uk-form-stacked' onSubmit={e => onSaveTeamEdit(e)}>
        <div className='uk-margin-medium-bottom'>
          <label>{t('modals.createTeam.teamName')}</label>
          <input
            type='text'
            className='md-input'
            value={name}
            onChange={e => onInputChange(e)}
            data-validation='length'
            data-validation-length='2-25'
            data-validation-error-msg={t('modals.createTeam.validName')}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <label style={{ marginBottom: 5 }}>{t('modals.createTeam.teamMembers')}</label>
          <MultiSelect
            items={mappedAccounts}
            initialSelected={selectedMembers}
            onChange={() => {}}
            ref={r => (membersSelectRef.current = r)}
          />
        </div>
        <div className='uk-modal-footer uk-text-right'>
          <Button text={t('common.close')} flat waves extraClass='uk-modal-close' />
          <Button text={t('modals.editTeam.saveButton')} flat waves style='primary' type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

EditTeamModal.propTypes = {
  team: PropTypes.object.isRequired,
  fetchAccounts: PropTypes.func.isRequired,
  unloadAccounts: PropTypes.func.isRequired,
  saveEditTeam: PropTypes.func.isRequired,
  accounts: PropTypes.object.isRequired,
  accountsLoading: PropTypes.bool.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  accounts: state.accountsState.accounts,
  accountsLoading: state.accountsState.loading
})

export default withTranslation()(connect(mapStateToProps, { fetchAccounts, unloadAccounts, saveEditTeam })(EditTeamModal))
