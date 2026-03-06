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
 *  Updated:    5/17/22 2:20 PM
 *  Copyright (c) 2014-2022. All rights reserved.
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

const AccountsSettingsContainer = ({ active, updateSetting, updateMultipleSettings, settings, t }) => {
  const [passwordComplexityEnabled, setPasswordComplexityEnabled] = useState(false)
  const [allowUserRegistrationEnabled, setAllowUserRegistrationEnabled] = useState(false)
  const [restarting, setRestarting] = useState(false)

  const getSetting = useCallback(
    stateName => {
      return settings.getIn(['settings', stateName, 'value']) ? settings.getIn(['settings', stateName, 'value']) : ''
    },
    [settings]
  )

  useEffect(() => {
    const pcVal = getSetting('accountsPasswordComplexity')
    if (passwordComplexityEnabled !== pcVal) setPasswordComplexityEnabled(pcVal)
    const aurVal = getSetting('allowUserRegistration')
    if (allowUserRegistrationEnabled !== aurVal) setAllowUserRegistrationEnabled(aurVal)
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

  const doUpdateSetting = useCallback(
    (stateName, name, value) => {
      updateSetting({ stateName, name, value })
    },
    [updateSetting]
  )

  return (
    <div className={active ? 'active' : 'hide'}>
      <SettingItem
        title={t('settings.allowUserRegistration')}
        subtitle={t('settings.allowUserRegistrationHint')}
        component={
          <EnableSwitch
            stateName='allowUserRegistration'
            label={t('settings.enable')}
            checked={allowUserRegistrationEnabled}
            onChange={e => {
              doUpdateSetting('allowUserRegistration', 'allowUserRegistration:enable', e.target.checked)
            }}
          />
        }
      />
      <SettingItem
        title={t('settings.passwordComplexity')}
        subtitle={t('settings.passwordComplexityHint')}
        tooltip={t('settings.passwordComplexityTooltip')}
        component={
          <EnableSwitch
            stateName={'accountsPasswordComplexity'}
            label={t('settings.enable')}
            checked={passwordComplexityEnabled}
            onChange={e => {
              doUpdateSetting('accountsPasswordComplexity', 'accountsPasswordComplexity:enable', e.target.checked)
            }}
          />
        }
      />
    </div>
  )
}

AccountsSettingsContainer.propTypes = {
  active: PropTypes.bool.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(mapStateToProps, { updateSetting, updateMultipleSettings })(AccountsSettingsContainer))
