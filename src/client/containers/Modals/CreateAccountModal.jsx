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
 *  Updated:    2/26/19 11:49 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import { createAccount } from 'actions/accounts'
import { fetchGroups, unloadGroups } from 'actions/groups'
import { fetchTeams, unloadTeams } from 'actions/teams'
import { fetchRoles } from 'actions/common'

import BaseModal from './BaseModal'
import Button from 'components/Button'
import SingleSelect from 'components/SingleSelect'
import MultiSelect from 'components/MultiSelect'

import $ from 'jquery'
import helpers from 'lib/helpers'

function CreateAccountModal (props) {
  const { t } = props
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [fullname, setFullname] = useState('')
  const [email, setEmail] = useState('')
  const [title, setTitle] = useState('')
  const [isAgentRole, setIsAgentRole] = useState(false)

  const selectedRoleRef = useRef('')
  const groupSelectRef = useRef(null)
  const teamSelectRef = useRef(null)
  const roleSelectErrorMessageRef = useRef(null)
  const groupSelectErrorMessageRef = useRef(null)

  useEffect(() => {
    props.fetchGroups({ type: 'all' })
    props.fetchTeams()
    props.fetchRoles()

    helpers.UI.inputs()
    helpers.formvalidator()
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()
  })

  const onInputChanged = useCallback((e, name) => {
    const setters = {
      username: setUsername,
      password: setPassword,
      passwordConfirm: setPasswordConfirm,
      fullname: setFullname,
      email: setEmail,
      title: setTitle
    }
    if (setters[name]) setters[name](e.target.value)
  }, [])

  const onRoleSelectChange = useCallback((e) => {
    selectedRoleRef.current = e.target.value

    const roleObject = props.roles.find(role => {
      return role.get('_id') === selectedRoleRef.current
    })

    setIsAgentRole(roleObject.get('isAdmin') || roleObject.get('isAgent'))

    if (!selectedRoleRef.current || selectedRoleRef.current.length < 1) roleSelectErrorMessageRef.current.classList.remove('hide')
    else roleSelectErrorMessageRef.current.classList.add('hide')
  }, [props.roles])

  const onGroupSelectChange = useCallback(() => {
    const selectedGroups = groupSelectRef.current.getSelected()
    if (!selectedGroups || selectedGroups.length < 1) groupSelectErrorMessageRef.current.classList.remove('hide')
    else groupSelectErrorMessageRef.current.classList.add('hide')
  }, [])

  const onFormSubmit = useCallback((e) => {
    e.preventDefault()
    const $form = $(e.target)

    let isValid = true

    if (!$form.isValid(null, null, false)) isValid = false

    if (!selectedRoleRef.current || selectedRoleRef.current.length < 1) {
      roleSelectErrorMessageRef.current.classList.remove('hide')
      if (isValid) isValid = false
    } else roleSelectErrorMessageRef.current.classList.add('hide')

    const selectedGroups = groupSelectRef.current ? groupSelectRef.current.getSelected() : undefined
    if (selectedGroups) {
      if (selectedGroups.length < 1) {
        groupSelectErrorMessageRef.current.classList.remove('hide')
        if (isValid) isValid = false
      } else groupSelectErrorMessageRef.current.classList.add('hide')
    }

    if (!isValid) return

    const payload = {
      username,
      fullname,
      title,
      email,
      groups: groupSelectRef.current ? groupSelectRef.current.getSelected() : undefined,
      teams: teamSelectRef.current ? teamSelectRef.current.getSelected() : undefined,
      role: selectedRoleRef.current,
      password: password.length > 3 ? password : undefined,
      passwordConfirm: passwordConfirm.length > 3 ? passwordConfirm : undefined
    }

    props.createAccount(payload)
  }, [username, fullname, title, email, password, passwordConfirm])

  const roles = props.roles
    .map(role => {
      return { text: role.get('name'), value: role.get('_id') }
    })
    .toArray()

  const groups = props.groups
    .map(group => {
      return { text: group.get('name'), value: group.get('_id') }
    })
    .toArray()

  const teams = props.teams
    .map(team => {
      return { text: team.get('name'), value: team.get('_id') }
    })
    .toArray()

  return (
    <BaseModal parentExtraClass='pt-0' extraClass='p-0 pb-25'>
      <div className='user-heading' style={{ minHeight: '130px', background: '#1976d2', padding: '24px' }}>
        <div className='uk-width-1-1'>
          <div style={{ width: '82px', height: '82px', float: 'left', marginRight: '24px', position: 'relative' }}>
            <div className='mediumProfilePic' style={{ position: 'relative' }}>
              <img src='/uploads/users/defaultProfile.jpg' alt='Profile Picture' />
            </div>
          </div>
          <div className='user-heading-content'>
            <h2>
              <span className='uk-text-truncate'>{t('modals.createAccount.title')}</span>
              <span className='sub-heading'>{t('modals.createAccount.subtitle')}</span>
            </h2>
          </div>
        </div>
      </div>
      <div style={{ margin: '24px 24px 0 24px' }}>
        <form className='uk-form-stacked' onSubmit={e => onFormSubmit(e)}>
          <div className='uk-margin-medium-bottom'>
            <label className='uk-form-label'>{t('modals.createAccount.username')}</label>
            <input
              type='text'
              className='md-input'
              value={username}
              onChange={e => onInputChanged(e, 'username')}
              data-validation='length'
              data-validation-length='min4'
              data-validation-error-msg={t('modals.createAccount.usernameMinLength')}
            />
          </div>
          <div className='uk-margin-medium-bottom uk-clearfix'>
            <div className='uk-float-left' style={{ width: '50%', paddingRight: '20px' }}>
              <label className='uk-form-label'>{t('modals.createAccount.name')}</label>
              <input
                type='text'
                className='md-input'
                value={fullname}
                onChange={e => onInputChanged(e, 'fullname')}
                data-validation='length'
                data-validation-length='min1'
                data-validation-error-msg={t('modals.createAccount.nameMinLength')}
              />
            </div>
            <div className='uk-float-left uk-width-1-2'>
              <label className='uk-form-label'>{t('modals.createAccount.title_field')}</label>
              <input
                type='text'
                className='md-input'
                value={title}
                onChange={e => onInputChanged(e, 'title')}
              />
            </div>
          </div>
          <div className='uk-margin-medium-bottom uk-clearfix'>
            <div className='uk-float-left' style={{ width: '50%', paddingRight: '20px' }}>
              <label className='uk-form-label'>{t('modals.createAccount.password')}</label>
              <input
                type='password'
                className='md-input'
                name='password_confirmation'
                value={password}
                onChange={e => onInputChanged(e, 'password')}
              />
            </div>
            <div className='uk-float-left uk-width-1-2'>
              <label className='uk-form-label'>{t('modals.createAccount.confirmPassword')}</label>
              <input
                type='password'
                className='md-input'
                name='password'
                value={passwordConfirm}
                onChange={e => onInputChanged(e, 'passwordConfirm')}
                data-validation='confirmation'
                data-validation-error-msg={t('modals.createAccount.passwordMismatch')}
              />
            </div>
          </div>
          <div className='uk-margin-medium-bottom'>
            <label className='uk-form-label'>{t('modals.createAccount.email')}</label>
            <input
              type='email'
              className='md-input'
              value={email}
              onChange={e => onInputChanged(e, 'email')}
              data-validation='email'
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label className='uk-form-label'>{t('modals.createAccount.role')}</label>
            <SingleSelect
              items={roles}
              width='100'
              showTextbox={false}
              onSelectChange={e => onRoleSelectChange(e)}
            />
            <span
              className='hide help-block'
              style={{ display: 'inline-block', marginTop: '10px', fontWeight: 'bold', color: '#d85030' }}
              ref={r => (roleSelectErrorMessageRef.current = r)}
            >
              {t('modals.createAccount.selectRole')}
            </span>
          </div>
          {!isAgentRole && (
            <div>
              <div className='uk-margin-medium-bottom'>
                <label className='uk-form-label'>{t('modals.createAccount.groups')}</label>
                <MultiSelect
                  items={groups}
                  onChange={e => onGroupSelectChange(e)}
                  ref={r => (groupSelectRef.current = r)}
                />
                <span
                  className='hide help-block'
                  style={{ display: 'inline-block', marginTop: '3px', fontWeight: 'bold', color: '#d85030' }}
                  ref={r => (groupSelectErrorMessageRef.current = r)}
                >
                  {t('modals.createAccount.selectGroup')}
                </span>
              </div>
            </div>
          )}
          {isAgentRole && (
            <div>
              <div className='uk-margin-medium-bottom'>
                <label className='uk-form-label'>{t('modals.createAccount.teams')}</label>
                <MultiSelect items={teams} onChange={() => {}} ref={r => (teamSelectRef.current = r)} />
              </div>
            </div>
          )}
          <div className='uk-modal-footer uk-text-right'>
            <Button text={t('common.close')} flat waves extraClass='uk-modal-close' />
            <Button text={t('modals.createAccount.title')} flat waves style='success' type='submit' />
          </div>
        </form>
      </div>
    </BaseModal>
  )
}

CreateAccountModal.propTypes = {
  common: PropTypes.object.isRequired,
  groups: PropTypes.object.isRequired,
  teams: PropTypes.object.isRequired,
  roles: PropTypes.object.isRequired,
  createAccount: PropTypes.func.isRequired,
  fetchGroups: PropTypes.func.isRequired,
  unloadGroups: PropTypes.func.isRequired,
  fetchTeams: PropTypes.func.isRequired,
  unloadTeams: PropTypes.func.isRequired,
  fetchRoles: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  roles: state.shared.roles,
  common: state.common,
  groups: state.groupsState.groups,
  teams: state.teamsState.teams
})

export default withTranslation()(connect(mapStateToProps, {
  createAccount,
  fetchGroups,
  unloadGroups,
  fetchTeams,
  unloadTeams,
  fetchRoles
})(CreateAccountModal))
