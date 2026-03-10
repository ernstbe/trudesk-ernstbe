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
 *  Updated:    3/30/19 3:10 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import { fetchTeams, unloadTeams } from 'actions/teams'
import { fetchGroups, unloadGroups } from 'actions/groups'
import { updateDepartment } from 'actions/departments'

import BaseModal from 'containers/Modals/BaseModal'

import helpers from 'lib/helpers'
import $ from 'jquery'
import Button from 'components/Button'
import MultiSelect from 'components/MultiSelect'

function EditDepartmentModal (props) {
  const { t, department } = props
  const [name, setName] = useState('')
  const [allGroups, setAllGroups] = useState(false)
  const [publicGroups, setPublicGroups] = useState(false)

  const teamsSelectRef = useRef(null)
  const groupSelectRef = useRef(null)

  useEffect(() => {
    props.fetchTeams()
    props.fetchGroups({ type: 'all' })

    setName(department.get('name'))
    const deptAllGroups = department.get('allGroups')
    setAllGroups(deptAllGroups)
    setPublicGroups(deptAllGroups ? true : department.get('publicGroups'))

    helpers.UI.inputs()
    helpers.UI.reRenderInputs()
    helpers.formvalidator()

    return () => {
      props.unloadTeams()
      props.unloadGroups()
    }
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()
    if (allGroups && groupSelectRef.current) groupSelectRef.current.selectAll()
  })

  const onInputChange = useCallback((e) => {
    setName(e.target.value)
  }, [])

  const onFormSubmit = useCallback((e) => {
    e.preventDefault()
    const $form = $(e.target)
    if (!$form.isValid(null, null, false)) return false

    const payload = {
      _id: department.get('_id'),
      name,
      teams: teamsSelectRef.current.getSelected(),
      allGroups,
      publicGroups,
      groups: allGroups ? [] : groupSelectRef.current.getSelected()
    }

    props.updateDepartment(payload)
  }, [name, allGroups, publicGroups, department])

  const departmentTeams = department.get('teams')
  const departmentGroups = department.get('groups')
  const mappedTeams = props.teams
    .map(team => {
      return { text: team.get('name'), value: team.get('_id') }
    })
    .toArray()

  const mappedGroups = props.groups
    .map(group => {
      return { text: group.get('name'), value: group.get('_id') }
    })
    .toArray()

  return (
    <BaseModal {...props} options={{ bgclose: false }}>
      <div className='mb-25'>
        <h2>{t('modals.editDepartment.title')}: {department.get('name')}</h2>
      </div>
      <form className='uk-form-stacked' onSubmit={e => onFormSubmit(e)}>
        <div className='uk-margin-medium-bottom'>
          <label>{t('modals.createDepartment.departmentName')}</label>
          <input
            type='text'
            className='md-input'
            value={name}
            onChange={e => onInputChange(e)}
            data-validation='length'
            data-validation-length='min2'
            data-validation-error-msg={t('modals.createDepartment.validName')}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <label style={{ marginBottom: 5 }}>{t('nav.teams')}</label>
          <MultiSelect
            items={mappedTeams}
            initialSelected={departmentTeams ? departmentTeams.map(d => d.get('_id')).toArray() : []}
            onChange={() => {}}
            ref={r => (teamsSelectRef.current = r)}
          />
        </div>
        <hr />
        <div className='uk-margin-medium-bottom uk-clearfix'>
          <div className='uk-float-left'>
            <h4 style={{ paddingLeft: 2 }}>{t('modals.createDepartment.accessAllGroups')}</h4>
          </div>
          <div className='uk-float-right md-switch md-green' style={{ marginTop: 5 }}>
            <label>
              {t('common.yes')}
              <input
                type='checkbox'
                checked={allGroups}
                onChange={e => {
                  const checked = e.target.checked
                  setAllGroups(checked)
                  setPublicGroups(checked)
                  if (checked) groupSelectRef.current.selectAll()
                  else groupSelectRef.current.deselectAll()
                }}
              />
              <span className='lever' />
            </label>
          </div>
        </div>
        <div className='uk-margin-medium-bottom uk-clearfix'>
          <div className='uk-float-left'>
            <h4 style={{ paddingLeft: 2 }}>{t('modals.createDepartment.accessPublicGroups')}</h4>
          </div>
          <div className='uk-float-right md-switch md-green' style={{ marginTop: 1 }}>
            <label>
              {t('common.yes')}
              <input
                type='checkbox'
                checked={publicGroups}
                onChange={e => {
                  setPublicGroups(e.target.checked)
                }}
              />
              <span className='lever' />
            </label>
          </div>
        </div>
        <div className='uk-margin-medium-bottom'>
          <label style={{ marginBottom: 5 }}>{t('modals.createDepartment.customerGroups')}</label>
          <MultiSelect
            items={mappedGroups}
            onChange={() => {}}
            initialSelected={departmentGroups ? departmentGroups.map(d => d.get('_id')).toArray() : []}
            ref={r => (groupSelectRef.current = r)}
            disabled={allGroups}
          />
        </div>
        <div className='uk-modal-footer uk-text-right'>
          <Button text={t('common.close')} flat waves extraClass='uk-modal-close' />
          <Button text={t('modals.editDepartment.saveButton')} flat waves style='primary' type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

EditDepartmentModal.propTypes = {
  department: PropTypes.object.isRequired,
  updateDepartment: PropTypes.func.isRequired,
  fetchTeams: PropTypes.func.isRequired,
  unloadTeams: PropTypes.func.isRequired,
  fetchGroups: PropTypes.func.isRequired,
  unloadGroups: PropTypes.func.isRequired,
  teams: PropTypes.object.isRequired,
  groups: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  teams: state.teamsState.teams,
  groups: state.groupsState.groups
})

export default withTranslation()(connect(mapStateToProps, { updateDepartment, fetchTeams, unloadTeams, fetchGroups, unloadGroups })(
  EditDepartmentModal
))
