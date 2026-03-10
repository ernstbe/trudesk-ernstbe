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
 *  Updated:    2/23/19 4:03 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import axios from 'axios'
import Log from '../../logger'

import { saveEditAccount } from 'actions/accounts'
import { fetchGroups, unloadGroups } from 'actions/groups'
import { fetchTeams, unloadTeams } from 'actions/teams'
import { fetchDepartments, unloadDepartments } from 'actions/departments'
import { fetchRoles } from 'actions/common'

import Button from 'components/Button'
import BaseModal from 'containers/Modals/BaseModal'
import SingleSelect from 'components/SingleSelect'
import MultiSelect from 'components/MultiSelect'

import helpers from 'lib/helpers'

function EditAccountModal ({ edit = false, ...restProps }) {
  const props = { edit, ...restProps }
  const { user, t } = props

  const [name, setName] = useState('')
  const [title, setTitle] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [email, setEmail] = useState('')
  const [isAgentRole, setIsAgentRole] = useState(false)

  const selectedRoleRef = useRef('')
  const groupSelectRef = useRef(null)
  const teamsSelectRef = useRef(null)
  const uploadImageInputRef = useRef(null)
  const uploadProfileImageRef = useRef(null)

  useEffect(() => {
    setName(user.fullname)
    setTitle(user.title)
    setEmail(user.email)
    setIsAgentRole(user.role.isAdmin || user.role.isAgent)

    helpers.UI.inputs()
    helpers.UI.reRenderInputs()

    props.fetchGroups({ type: 'all' })
    props.fetchTeams()
    props.fetchDepartments()
    props.fetchRoles()

    return () => {
      props.unloadGroups()
      props.unloadTeams()
      props.unloadDepartments()
    }
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()
  })

  const onFileBtnClick = useCallback((e) => {
    e.stopPropagation()
    if (uploadImageInputRef.current) uploadImageInputRef.current.click()
  }, [])

  const onImageUploadChanged = useCallback((e) => {
    const self = e.target
    const formData = new FormData()
    formData.append('username', user.username)
    formData.append('_id', user._id)
    formData.append('image', self.files[0])

    axios
      .post('/accounts/uploadImage', formData)
      .then(res => {
        const timestamp = new Date().getTime()
        uploadProfileImageRef.current.setAttribute('src', `${res.data}?${timestamp}`)
      })
      .catch(err => {
        Log.error(err)
      })
  }, [user.username, user._id])

  const onInputChanged = useCallback((e, stateName) => {
    const setters = {
      name: setName,
      title: setTitle,
      password: setPassword,
      confirmPassword: setConfirmPassword,
      email: setEmail
    }
    if (setters[stateName]) setters[stateName](e.target.value)
  }, [])

  const onRoleSelectChange = useCallback((e) => {
    selectedRoleRef.current = e.target.value

    const roleObject = props.roles.find(role => {
      return role.get('_id') === selectedRoleRef.current
    })

    setIsAgentRole(roleObject.get('isAdmin') || roleObject.get('isAgent'))
  }, [props.roles])

  const onSubmitSaveAccount = useCallback((e) => {
    e.preventDefault()
    if (!edit) return
    const data = {
      username: user.username,
      fullname: name,
      title,
      email,
      groups: !isAgentRole && groupSelectRef.current ? groupSelectRef.current.getSelected() : undefined,
      teams: isAgentRole && teamsSelectRef.current ? teamsSelectRef.current.getSelected() : undefined,
      role: selectedRoleRef.current,
      password: password.length > 0 ? password : undefined,
      passwordConfirm: confirmPassword.length > 0 ? confirmPassword : undefined
    }

    props.saveEditAccount(data)
  }, [edit, user.username, name, title, email, isAgentRole, password, confirmPassword])

  const customer = !isAgentRole
  const profilePicture = user.image || 'defaultProfile.jpg'
  const parsedRoles = helpers.getRolesByHierarchy()
  const roles = parsedRoles.map(role => {
    return { text: role.name, value: role._id }
  })

  const teams = props.teams
    ? props.teams
      .map(team => {
        return { text: team.get('name'), value: team.get('_id') }
      })
      .toArray()
    : []

  const departments = props.departments
    ? props.departments
      .map(department => {
        return { text: department.get('name'), value: department.get('_id') }
      })
      .toArray()
    : []

  const groups = props.groups
    ? props.groups
      .map(group => {
        return { text: group.get('name'), value: group.get('_id') }
      })
      .toArray()
    : []

  if (!user.teams) user.teams = []
  if (!user.departments) user.departments = []
  if (!user.groups) user.groups = []

  return (
    <BaseModal parentExtraClass='pt-0' extraClass='p-0 pb-25' options={{ bgclose: false }}>
      <div className='user-heading' style={{ minHeight: '130px', background: '#1976d2', padding: '24px' }}>
        <div className='uk-width-1-1'>
          <div style={{ width: '82px', height: '82px', float: 'left', marginRight: '24px', position: 'relative' }}>
            {edit && (
              <form className='form nomargin' encType='multipart/form-data'>
                <div className='mediumProfilePic' style={{ position: 'relative' }}>
                  <input name='_id' type='hidden' value={user._id} readOnly />
                  <input name='username' type='hidden' value={user.username} readOnly />
                  <input
                    type='file'
                    style={{ display: 'none' }}
                    ref={r => (uploadImageInputRef.current = r)}
                    onChange={e => onImageUploadChanged(e)}
                  />
                  <img
                    src={`/uploads/users/${profilePicture}`}
                    alt='Profile Picture'
                    ref={r => (uploadProfileImageRef.current = r)}
                  />
                </div>
                <div className='profile-picture-controls'>
                  <span className='btn-file' onClick={e => onFileBtnClick(e)}>
                    <i className='material-icons'>file_upload</i>
                  </span>
                </div>
              </form>
            )}
            {!edit && (
              <div className='mediumProfilePic' style={{ position: 'relative' }}>
                <img
                  src={`/uploads/users/${profilePicture}`}
                  alt='Profile Picture'
                  ref={r => (uploadProfileImageRef.current = r)}
                />
              </div>
            )}
          </div>
          <div className='user-heading-content'>
            <h2>
              <span className='uk-text-truncate'>{user.username}</span>
              <span className='sub-heading'>{user.title}</span>
            </h2>
          </div>
        </div>
      </div>
      <div style={{ margin: '24px 24px 0 24px' }}>
        <form className='uk-form-stacked' onSubmit={e => onSubmitSaveAccount(e)}>
          <div className='uk-margin-medium-bottom uk-clearfix'>
            <div className='uk-float-left' style={{ width: '50%', paddingRight: '20px' }}>
              <label className='uk-form-label'>{t('modals.createAccount.name')}</label>
              <input
                type='text'
                className='md-input'
                value={name}
                onChange={e => onInputChanged(e, 'name')}
                disabled={!edit}
              />
            </div>
            <div className='uk-float-left uk-width-1-2'>
              <label className='uk-form-label'>{t('modals.createAccount.title_field')}</label>
              <input
                type='text'
                className='md-input'
                value={title}
                onChange={e => onInputChanged(e, 'title')}
                disabled={!edit}
              />
            </div>
          </div>
          {edit && (
            <div>
              <div className='uk-margin-medium-bottom uk-clearfix'>
                <div className='uk-float-left' style={{ width: '50%', paddingRight: '20px' }}>
                  <label className='uk-form-label'>{t('modals.createAccount.password')}</label>
                  <input
                    type='password'
                    className='md-input'
                    value={password}
                    onChange={e => onInputChanged(e, 'password')}
                  />
                </div>
                <div className='uk-float-left uk-width-1-2'>
                  <label className='uk-form-label'>{t('modals.createAccount.confirmPassword')}</label>
                  <input
                    type='password'
                    className='md-input'
                    value={confirmPassword}
                    onChange={e => onInputChanged(e, 'confirmPassword')}
                  />
                </div>
              </div>
            </div>
          )}
          <div className='uk-margin-medium-bottom'>
            <label className='uk-form-label'>{t('modals.createAccount.email')}</label>
            <input
              type='email'
              className='md-input'
              value={email}
              onChange={e => onInputChanged(e, 'email')}
              disabled={!edit}
            />
          </div>
          {edit && (
            <div className='uk-margin-medium-bottom'>
              <label className='uk-form-label'>{t('modals.createAccount.role')}</label>
              <SingleSelect
                items={roles}
                width='100'
                showTextbox={false}
                defaultValue={user.role._id}
                onSelectChange={e => onRoleSelectChange(e)}
                disabled={!edit}
              />
            </div>
          )}
          {props.groups && customer && (
            <div className='uk-margin-medium-bottom'>
              <label className='uk-form-label'>{t('modals.createAccount.groups')}</label>
              <MultiSelect
                items={groups}
                initialSelected={user.groups.map(i => i._id)}
                onChange={() => {}}
                ref={r => (groupSelectRef.current = r)}
                disabled={!edit}
              />
            </div>
          )}
          {!customer && (
            <div>
              <div className='uk-margin-medium-bottom'>
                <label className='uk-form-label'>{t('modals.createAccount.teams')}</label>
                <MultiSelect
                  items={teams}
                  initialSelected={user.teams.map(i => i._id)}
                  onChange={() => {}}
                  ref={r => (teamsSelectRef.current = r)}
                  disabled={!edit}
                />
              </div>

              <div className='uk-margin-medium-bottom'>
                <label className='uk-form-label'>{t('modals.editAccount.departments')}</label>
                <MultiSelect
                  items={departments}
                  initialSelected={user.departments.map(i => i._id)}
                  onChange={() => {}}
                  disabled
                />
              </div>
            </div>
          )}
          <div className='uk-modal-footer uk-text-right'>
            <Button text={t('common.close')} flat waves extraClass='uk-modal-close' />
            <Button
              text={t('modals.editAccount.saveAccount')}
              flat
              waves
              style='primary'
              type='submit'
              disabled={!edit}
            />
          </div>
        </form>
      </div>
    </BaseModal>
  )
}

EditAccountModal.propTypes = {
  edit: PropTypes.bool.isRequired,
  user: PropTypes.object.isRequired,
  groups: PropTypes.object.isRequired,
  teams: PropTypes.object.isRequired,
  departments: PropTypes.object.isRequired,
  saveEditAccount: PropTypes.func.isRequired,
  fetchGroups: PropTypes.func.isRequired,
  unloadGroups: PropTypes.func.isRequired,
  fetchTeams: PropTypes.func.isRequired,
  unloadTeams: PropTypes.func.isRequired,
  fetchDepartments: PropTypes.func.isRequired,
  unloadDepartments: PropTypes.func.isRequired,
  fetchRoles: PropTypes.func.isRequired,
  roles: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  groups: state.groupsState.groups,
  teams: state.teamsState.teams,
  departments: state.departmentsState.departments,
  roles: state.shared.roles
})

export default withTranslation()(connect(mapStateToProps, {
  saveEditAccount,
  fetchGroups,
  unloadGroups,
  fetchTeams,
  unloadTeams,
  fetchDepartments,
  unloadDepartments,
  fetchRoles
})(EditAccountModal))
