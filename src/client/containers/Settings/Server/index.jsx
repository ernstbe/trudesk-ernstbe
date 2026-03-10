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
 *  Updated:    9/18/21 11:41 AM
 *  Copyright (c) 2014-2021. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { updateSetting, updateMultipleSettings } from 'actions/settings'

import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'

import helpers from 'lib/helpers'
import axios from 'axios'
import Log from '../../../logger'
import EnableSwitch from 'components/Settings/EnableSwitch'
import UIKit from 'uikit'

const ServerSettingsController = ({ active, updateSetting, updateMultipleSettings, settings, t }) => {
  const [maintenanceModeEnabled, setMaintenanceModeEnabled] = useState(false)
  const [restarting, setRestarting] = useState(false)

  const getSetting = useCallback(
    stateName => {
      return settings.getIn(['settings', stateName, 'value'])
        ? settings.getIn(['settings', stateName, 'value'])
        : ''
    },
    [settings]
  )

  useEffect(() => {
    const val = getSetting('maintenanceMode')
    if (maintenanceModeEnabled !== val) setMaintenanceModeEnabled(val)
  }, [settings])

  const restartServer = useCallback(() => {
    setRestarting(true)

    const token = document.querySelector('meta[name="csrf-token"]').getAttribute('content')
    axios
      .post(
        '/api/v1/admin/restart',
        {},
        {
          headers: {
            'CSRF-TOKEN': token
          }
        }
      )
      .catch(error => {
        helpers.hideLoader()
        Log.error(error.responseText)
        Log.error('Unable to restart server. Server must run under PM2 and Account must have admin rights.')
        helpers.UI.showSnackbar('Unable to restart server. Are you an Administrator?', true)
      })
      .then(() => {
        setRestarting(false)
      })
  }, [])

  const onMaintenanceModeChange = useCallback(
    e => {
      const val = e.target.checked

      if (val === true) {
        UIKit.modal.confirm(
          `<h2>Are you sure?</h2>
        <p style="font-size: 15px;">
            <span class="uk-text-danger" style="font-size: 15px;">This will force logout every user and prevent non-administrators from logging in.</span>
        </p>
        `,
          () => {
            updateSetting({
              name: 'maintenanceMode:enable',
              value: val,
              stateName: 'maintenanceMode',
              noSnackbar: true
            }).then(() => {
              setMaintenanceModeEnabled(val)
            })
          },
          {
            labels: { Ok: 'Yes', Cancel: 'No' },
            confirmButtonClass: 'md-btn-danger'
          }
        )
      } else {
        updateSetting({ name: 'maintenanceMode:enable', value: val, stateName: 'maintenanceMode', noSnackbar: true })
          .then(() => {
            setMaintenanceModeEnabled(val)
          })
      }
    },
    [updateSetting]
  )

  return (
    <div className={active ? 'active' : 'hide'}>
      <SettingItem
        title={t('settings.restartServer')}
        subtitle={t('settings.restartServerHint')}
        component={
          <Button
            text={t('settings.restart')}
            flat={false}
            waves
            style='danger'
            extraClass='right mt-8 mr-5'
            onClick={restartServer}
            disabled={restarting}
          />
        }
      />
      <SettingItem
        title={t('settings.maintenanceMode')}
        subtitle={t('settings.maintenanceModeHint')}
        component={
          <EnableSwitch
            stateName='maintenanceMode'
            label={t('settings.enable')}
            checked={maintenanceModeEnabled}
            onChange={e => onMaintenanceModeChange(e)}
          />
        }
      />
    </div>
  )
}

ServerSettingsController.propTypes = {
  active: PropTypes.bool.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(mapStateToProps, { updateSetting, updateMultipleSettings })(ServerSettingsController))
