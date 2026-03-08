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
 *  Updated:    2/15/19 8:55 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'

import { without, uniq } from 'lodash'

import SettingItem from 'components/Settings/SettingItem'
import EnableSwitch from 'components/Settings/EnableSwitch'
import PermSwitchPartial from './permSwitchPartial'

import helpers from 'lib/helpers'

const PermissionGroupPartial = ({ title, subtitle, role, grants, roleSpecials: roleSpecialsProp = [] }) => {
  const [all, setAll] = useState('')
  const [create, setCreate] = useState('')
  const [view, setView] = useState('')
  const [update, setUpdate] = useState('')
  const [del, setDel] = useState('')
  const [special, setSpecial] = useState([])
  const [roleSpecials, setRoleSpecials] = useState('')

  useEffect(() => {
    setAll(grants.all || '')
    setCreate(grants.create || '')
    setView(grants.view || '')
    setUpdate(grants.update || '')
    setDel(grants.delete || '')
    setSpecial(grants.special || [])

    setRoleSpecials(roleSpecialsProp || [])
  }, [])

  useEffect(() => {
    setRoleSpecials(roleSpecialsProp)
  }, [roleSpecialsProp])

  useEffect(() => {
    if (grants.all !== undefined) {
      setAll(prev => {
        if (prev !== grants.all) return grants.all
        return prev
      })
    }
    if (all === true) {
      if (create !== true) setCreate(true)
      if (view !== true) setView(true)
      if (update !== true) setUpdate(true)
      if (del !== true) setDel(true)
      if (!helpers.arrayIsEqual(special, ['*'])) setSpecial(['*'])
    } else {
      if (grants.create !== undefined) setCreate(grants.create)
      if (grants.view !== undefined) setView(grants.view)
      if (grants.update !== undefined) setUpdate(grants.update)
      if (grants.delete !== undefined) setDel(grants.delete)
      if (grants.special !== undefined) setSpecial(grants.special)
    }
  }, [grants])

  const onEnableSwitchChanged = useCallback(
    (e, name) => {
      if (name === 'all') {
        setAll(e.target.checked)
        setCreate(e.target.checked)
        setView(e.target.checked)
        setUpdate(e.target.checked)
        setDel(e.target.checked)
        if (e.target.checked) {
          setSpecial(['*'])
        } else {
          setSpecial([])
        }
      } else if (name === 'create') {
        setCreate(e.target.checked)
      } else if (name === 'view') {
        setView(e.target.checked)
      } else if (name === 'update') {
        setUpdate(e.target.checked)
      } else if (name === 'delete') {
        setDel(e.target.checked)
      }
    },
    []
  )

  const hasSpecial = useCallback(
    perm => {
      if (!special.length < 0) return false
      if (helpers.arrayIsEqual(special, ['*'])) return true
      return special.indexOf(perm) !== -1
    },
    [special]
  )

  const onSpecialChanged = useCallback(
    (e, perm) => {
      if (!perm) return
      if (all) return
      let arr = [...special]
      if (e.target.checked) {
        arr.push(perm)
      } else {
        arr = without(arr, perm)
      }

      setSpecial(uniq(arr))
    },
    [all, special]
  )

  return (
    <div>
      <SettingItem
        title={title}
        subtitle={subtitle}
        subPanelPadding='0'
        component={
          <EnableSwitch
            stateName={`all_perm_${title}_${role.get('_id')}`}
            label='All'
            checked={all}
            onChange={e => onEnableSwitchChanged(e, 'all')}
          />
        }
      >
        <PermSwitchPartial
          title='Create'
          checked={create}
          onChange={e => onEnableSwitchChanged(e, 'create')}
          disabled={all}
        />
        <PermSwitchPartial
          title='View'
          onChange={e => onEnableSwitchChanged(e, 'view')}
          checked={view}
          disabled={all}
        />
        <PermSwitchPartial
          title='Update'
          onChange={e => onEnableSwitchChanged(e, 'update')}
          checked={update}
          disabled={all}
        />
        <PermSwitchPartial
          title='Delete'
          onChange={e => onEnableSwitchChanged(e, 'delete')}
          checked={del}
          disabled={all}
        />

        {/* SPECIALS */}
        {roleSpecials.length > 0 && (
          <div>
            <div className='panel-body2 bg-warn' style={{ padding: '0 10px' }}>
              <div className='uk-clearfix'>
                <div className='left'>
                  <h6
                    className='text-dark'
                    style={{ padding: '0 0 0 15px', margin: '20px 0', fontSize: '18px', lineHeight: '14px' }}
                  >
                    Special Permissions
                  </h6>
                </div>
              </div>
            </div>
            {roleSpecials.map(perm => {
              return (
                <PermSwitchPartial
                  key={`${perm.title}_${perm.perm}`}
                  title={perm.title}
                  checked={hasSpecial(perm.perm)}
                  onChange={e => onSpecialChanged(e, perm.perm)}
                  disabled={all}
                />
              )
            })}
          </div>
        )}
      </SettingItem>
    </div>
  )
}

PermissionGroupPartial.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  roleSpecials: PropTypes.array,
  role: PropTypes.object.isRequired,
  grants: PropTypes.object.isRequired
}

export default PermissionGroupPartial
