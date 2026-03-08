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
 *  Updated:    6/20/23 6:00 PM
 *  Copyright (c) 2014-2023. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Input from 'components/Input'
import { fetchSettings } from 'actions/settings'
import { showModal, hideModal } from 'actions/common'
import ColorSelector from 'components/ColorSelector'
import Button from 'components/Button'
import EnableSwitch from 'components/Settings/EnableSwitch'

import api from 'api'
import helpers from 'lib/helpers'

const TicketStatusBody = ({ status, fetchSettings, showModal }) => {
  const [statusName, setStatusName] = useState('')
  const [htmlColor, setHtmlColor] = useState('')
  const [slatimer, setSlatimer] = useState('')
  const [isResolved, setIsResolved] = useState('')

  useEffect(() => {
    setStatusName(status.get('name') || '')
    setHtmlColor(status.get('htmlColor') || '')
    setIsResolved(status.get('isResolved') || false)
    setSlatimer(status.get('slatimer') || false)
  }, [])

  useEffect(() => {
    if (statusName === '') setStatusName(status.get('name') || '')
    if (htmlColor === '') setHtmlColor(status.get('htmlColor') || '')
    if (isResolved === '') setIsResolved(status.get('isResolved') || false)
    if (slatimer === '') setSlatimer(status.get('slatimer') || false)
  })

  const onSaveClicked = useCallback(
    e => {
      const id = status.get('_id')

      api.tickets
        .updateStatus({ id, name: statusName, htmlColor, isResolved, slatimer })
        .then(res => {
          helpers.UI.showSnackbar('Status updated')
          fetchSettings()
        })
        .catch(e => {
          console.log(e)
          helpers.UI.showSnackbar(e, true)
        })
    },
    [status, statusName, htmlColor, isResolved, slatimer, fetchSettings]
  )

  const showDeleteTicketStatusModal = useCallback(
    (e, status) => {
      showModal('DELETE_STATUS', { status })
    },
    [showModal]
  )

  return (
    <div>
      <form>
        <div className='ticket-status-general-wrapper'>
          <h2 className='text-light'>General</h2>
          <hr style={{ margin: '5px 0 25px 0' }} />
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'inline-block', cursor: 'pointer' }}>Status Name</label>
            <Input defaultValue={statusName} onChange={v => setStatusName(v)} />
          </div>
          <div style={{ marginBottom: 15 }}>
            <label style={{ display: 'inline-block', cursor: 'pointer' }}>Status Color</label>
            <ColorSelector
              showLabel={false}
              hideRevert
              defaultColor={htmlColor}
              onChange={e => setHtmlColor(e.target.value)}
            />
          </div>
        </div>
        <h2 className='text-light mt-25'>Properties</h2>
        <hr style={{ margin: '5px 0 25px 0' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <h4 className='uk-width-1-2' style={{ flexGrow: 1 }}>
            SLA Timer
          </h4>
          <EnableSwitch
            stateName={`slatimer_${status.get('_id')}`}
            label='Yes'
            checked={slatimer}
            onChange={e => setSlatimer(e.target.checked)}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <h4 className='uk-width-1-2' style={{ flexGrow: 1 }}>
            Is Resolved
          </h4>
          <EnableSwitch
            stateName={`isResolved_${status.get('_id')}`}
            label='Yes'
            checked={isResolved}
            onChange={e => setIsResolved(e.target.checked)}
          />
        </div>
        <div className='uk-margin-large-top' style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button text='Save Status' style='success' onClick={e => onSaveClicked(e)} />
        </div>
      </form>
      {!status.get('isLocked') && (
        <>
          <div className='uk-margin-large-top' style={{ display: 'block', height: 15 }} />
          <div className='uk-margin-large-top'>
            <h2 className='text-light'>Danger Zone</h2>
            <div className='danger-zone'>
              <div className='dz-box uk-clearfix'>
                <div className='uk-float-left'>
                  <h5>Delete this status</h5>
                  <p>Once you delete a ticket status, there is no going back. Please be certain.</p>
                </div>
                <div className='uk-float-right' style={{ paddingTop: '10px' }}>
                  <Button
                    text='Delete'
                    small
                    style='danger'
                    onClick={e => showDeleteTicketStatusModal(e, status)}
                  />
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

TicketStatusBody.propTypes = {
  status: PropTypes.object.isRequired,
  fetchSettings: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  hideModal: PropTypes.func.isRequired
}

export default connect(null, { fetchSettings, showModal, hideModal })(TicketStatusBody)
