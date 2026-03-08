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
 *  Updated:    2/15/19 6:05 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { isEqual } from 'lodash'
import { updatePermissions } from 'actions/settings'
import { showModal } from 'actions/common'

import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import EnableSwitch from 'components/Settings/EnableSwitch'
import PermissionGroupPartial from './permissionGroupPartial'

import helpers from 'lib/helpers'

function defaultGrants () {
  return {
    all: false,
    create: false,
    view: false,
    update: false,
    delete: false,
    special: []
  }
}

function buildPermArray (permGroup) {
  let arr = []
  if (permGroup.all) arr = ['*']
  else {
    if (permGroup.create) arr.push('create')
    if (permGroup.view) arr.push('view')
    if (permGroup.update) arr.push('update')
    if (permGroup.delete) arr.push('delete')
    if (permGroup.special) arr.push(permGroup.special.join(' '))
  }

  return arr
}

function mapTicketSpecials () {
  return [
    { title: 'Print', perm: 'print' },
    { title: 'Notes', perm: 'notes' },
    { title: 'Manage Public Tickets', perm: 'public' },
    { title: 'Can View All Tickets in Assigned Groups', perm: 'viewall' }
  ]
}

function mapAccountSpecials () {
  return [{ title: 'Import', perm: 'import' }]
}

function mapNoticeSpecials () {
  return [
    { title: 'Activate', perm: 'activate' },
    { title: 'Deactivate', perm: 'deactivate' }
  ]
}

const PermissionBody = ({ role, updatePermissions, showModal }) => {
  const [isAdmin, setIsAdmin] = useState('')
  const [isAgent, setIsAgent] = useState('')
  const [hasHierarchy, setHasHierarchy] = useState('')
  const grantsRef = useRef([])

  const [ticketGrants, setTicketGrants] = useState(defaultGrants())
  const [commentGrants, setCommentGrants] = useState(defaultGrants())
  const [accountGrants, setAccountGrants] = useState(defaultGrants())
  const [groupGrants, setGroupGrants] = useState(defaultGrants())
  const [teamGrants, setTeamGrants] = useState(defaultGrants())
  const [departmentGrants, setDepartmentGrants] = useState(defaultGrants())
  const [reportGrants, setReportGrants] = useState(defaultGrants())
  const [noticeGrants, setNoticeGrants] = useState(defaultGrants())

  const ticketPermGroupRef = useRef(null)
  const commentPermGroupRef = useRef(null)
  const accountPermGroupRef = useRef(null)
  const groupPermGroupRef = useRef(null)
  const teamPermGroupRef = useRef(null)
  const departmentPermGroupRef = useRef(null)
  const reportPermGroupRef = useRef(null)
  const noticePermGroupRef = useRef(null)

  const parseGrants = useCallback(() => {
    if (!grantsRef.current) return
    const parsedGrants = helpers.parseRoleGrants(grantsRef.current)

    if (parsedGrants.tickets) setTicketGrants(prev => (isEqual(parsedGrants.tickets, prev) ? prev : parsedGrants.tickets))
    if (parsedGrants.comments) setCommentGrants(prev => (isEqual(parsedGrants.comments, prev) ? prev : parsedGrants.comments))
    if (parsedGrants.accounts) setAccountGrants(prev => (isEqual(parsedGrants.accounts, prev) ? prev : parsedGrants.accounts))
    if (parsedGrants.groups) setGroupGrants(prev => (isEqual(parsedGrants.groups, prev) ? prev : parsedGrants.groups))
    if (parsedGrants.teams) setTeamGrants(prev => (isEqual(parsedGrants.teams, prev) ? prev : parsedGrants.teams))
    if (parsedGrants.departments) setDepartmentGrants(prev => (isEqual(parsedGrants.departments, prev) ? prev : parsedGrants.departments))
    if (parsedGrants.reports) setReportGrants(prev => (isEqual(parsedGrants.reports, prev) ? prev : parsedGrants.reports))
    if (parsedGrants.notices) setNoticeGrants(prev => (isEqual(parsedGrants.notices, prev) ? prev : parsedGrants.notices))
  }, [])

  useEffect(() => {
    setIsAdmin(role.get('isAdmin') || false)
    setIsAgent(role.get('isAgent') || false)
    setHasHierarchy(role.get('hierarchy') || false)
    grantsRef.current = role.get('grants').toArray() || []

    parseGrants()
  }, [])

  useEffect(() => {
    if (isAdmin === '') setIsAdmin(role.get('isAdmin') || false)
    if (isAgent === '') setIsAgent(role.get('isAgent') || false)
    if (hasHierarchy === '') setHasHierarchy(role.get('hierarchy') || false)
    if (grantsRef.current.length < 1) grantsRef.current = role.get('grants').toArray() || []

    parseGrants()
  })

  const onEnableSwitchChanged = useCallback((e, name) => {
    if (name === 'isAdmin') setIsAdmin(e.target.checked)
    else if (name === 'isAgent') setIsAgent(e.target.checked)
    else if (name === 'hasHierarchy') setHasHierarchy(e.target.checked)
  }, [])

  const onSubmit = useCallback(
    e => {
      e.preventDefault()
      const obj = {}
      obj._id = role.get('_id')
      if (isAdmin) {
        obj.admin = ['*']
        obj.settings = ['*']
      }
      if (isAgent) obj.agent = ['*']
      obj.hierarchy = hasHierarchy

      obj.tickets = buildPermArray(ticketPermGroupRef.current)
      obj.comments = buildPermArray(commentPermGroupRef.current)
      obj.accounts = buildPermArray(accountPermGroupRef.current)
      obj.groups = buildPermArray(groupPermGroupRef.current)
      obj.teams = buildPermArray(teamPermGroupRef.current)
      obj.departments = buildPermArray(departmentPermGroupRef.current)
      obj.reports = buildPermArray(reportPermGroupRef.current)
      obj.notices = buildPermArray(noticePermGroupRef.current)

      updatePermissions(obj)
    },
    [role, isAdmin, isAgent, hasHierarchy, updatePermissions]
  )

  const showDeletePermissionRole = useCallback(
    e => {
      e.preventDefault()
      showModal('DELETE_ROLE', { role })
    },
    [showModal, role]
  )

  return (
    <div>
      <form onSubmit={e => onSubmit(e)}>
        <SettingItem
          title='Admin'
          tooltip='Role is considered an admin. Enabling management of the trudesk instance.'
          subtitle='Is this role defined as an admin role?'
          component={
            <EnableSwitch
              stateName={'isAdmin_' + role.get('_id')}
              label='Enable'
              checked={isAdmin}
              onChange={e => onEnableSwitchChanged(e, 'isAdmin')}
            />
          }
        />
        <SettingItem
          title='Support Agent'
          subtitle='Is this role defined as an agent role?'
          tooltip='Role is considered an agent role. Enabling agent views and displaying in agent lists.'
          component={
            <EnableSwitch
              stateName={'isAgent_' + role.get('_id')}
              label='Enable'
              checked={isAgent}
              onChange={e => onEnableSwitchChanged(e, 'isAgent')}
            />
          }
        />
        <SettingItem
          title='Enable Hierarchy'
          subtitle='Allow this role to manage resources owned by roles defined under it.'
          component={
            <EnableSwitch
              stateName={'hasHierarchy_' + role.get('_id')}
              label='Enable'
              checked={hasHierarchy}
              onChange={e => onEnableSwitchChanged(e, 'hasHierarchy')}
            />
          }
        />
        <PermissionGroupPartial
          ref={ticketPermGroupRef}
          title='Tickets'
          role={role}
          grants={ticketGrants}
          roleSpecials={mapTicketSpecials()}
          subtitle='Ticket Permissions'
        />
        <PermissionGroupPartial
          ref={commentPermGroupRef}
          title='Comments'
          role={role}
          grants={commentGrants}
          subtitle='Ticket Comments Permissions'
        />
        <PermissionGroupPartial
          ref={accountPermGroupRef}
          title='Accounts'
          role={role}
          roleSpecials={mapAccountSpecials()}
          grants={accountGrants}
          subtitle='Account Permissions'
        />
        <PermissionGroupPartial
          ref={groupPermGroupRef}
          title='Groups'
          role={role}
          grants={groupGrants}
          subtitle='Group Permissions'
        />
        <PermissionGroupPartial
          ref={teamPermGroupRef}
          title='Teams'
          role={role}
          grants={teamGrants}
          subtitle='Team Permissions'
        />
        <PermissionGroupPartial
          ref={departmentPermGroupRef}
          title='Departments'
          role={role}
          grants={departmentGrants}
          subtitle='Department Permissions'
        />
        <PermissionGroupPartial
          ref={reportPermGroupRef}
          title='Reports'
          role={role}
          grants={reportGrants}
          subtitle='Report Permissions'
        />
        <PermissionGroupPartial
          ref={noticePermGroupRef}
          title='Notices'
          role={role}
          grants={noticeGrants}
          roleSpecials={mapNoticeSpecials()}
          subtitle='Notice Permissions'
        />
        <div className='uk-margin-large-bottom'>
          <h2 className='text-light'>Danger Zone</h2>
          <div className='danger-zone'>
            <div className='dz-box uk-clearfix'>
              <div className='uk-float-left'>
                <h5>Delete this permission role?</h5>
                <p>Once you delete a permission role, there is no going back. Please be certain.</p>
              </div>
              <div className='uk-float-right' style={{ paddingTop: '10px' }}>
                <Button
                  text='Delete'
                  small
                  style='danger'
                  onClick={e => showDeletePermissionRole(e)}
                />
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className='box uk-clearfix'>
            <div className='uk-float-right' style={{ paddingTop: '10px' }}>
              <Button type='submit' style='success' waves text='Save Permissions' />
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

PermissionBody.propTypes = {
  role: PropTypes.object.isRequired,
  updatePermissions: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired
}

export default connect(null, { updatePermissions, showModal })(PermissionBody)
