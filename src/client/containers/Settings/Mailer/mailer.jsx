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
 *  Updated:    2/7/19 1:36 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import axios from 'axios'
import Log from '../../../logger'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { updateSetting, updateMultipleSettings } from 'actions/settings'
import helpers from 'lib/helpers'

import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import EnableSwitch from 'components/Settings/EnableSwitch'

const MailerSettingsMailer = ({ settings, updateSetting, updateMultipleSettings, t }) => {
  const [mailerSSL, setMailerSSL] = useState('')
  const [mailerHost, setMailerHost] = useState('')
  const [mailerPort, setMailerPort] = useState('')
  const [mailerUsername, setMailerUsername] = useState('')
  const [mailerPassword, setMailerPassword] = useState('')
  const [mailerFrom, setMailerFrom] = useState('')

  useEffect(() => {
    helpers.UI.inputs()
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()
  })

  useEffect(() => {
    if (settings) {
      if (mailerSSL === '') setMailerSSL(settings.getIn(['settings', 'mailerSSL', 'value']) || '')
      if (!mailerHost) setMailerHost(settings.getIn(['settings', 'mailerHost', 'value']) || '')
      if (!mailerPort) setMailerPort(settings.getIn(['settings', 'mailerPort', 'value']) || '')
      if (!mailerUsername) setMailerUsername(settings.getIn(['settings', 'mailerUsername', 'value']) || '')
      if (!mailerPassword) setMailerPassword(settings.getIn(['settings', 'mailerPassword', 'value']) || '')
      if (!mailerFrom) setMailerFrom(settings.getIn(['settings', 'mailerFrom', 'value']) || '')
    }
  }, [settings])

  const getSetting = useCallback(
    name => {
      return settings.getIn(['settings', name, 'value']) ? settings.getIn(['settings', name, 'value']) : ''
    },
    [settings]
  )

  const onEnableMailerChanged = useCallback(
    e => {
      updateSetting({
        name: 'mailer:enable',
        stateName: 'mailerEnabled',
        value: e.target.checked,
        noSnackbar: true
      })
    },
    [updateSetting]
  )

  const onMailerSSLChanged = useCallback(e => {
    setMailerSSL(e.target.checked)
  }, [])

  const onInputValueChanged = useCallback((e, stateName) => {
    const value = e.target.value
    if (stateName === 'mailerHost') setMailerHost(value)
    else if (stateName === 'mailerPort') setMailerPort(value)
    else if (stateName === 'mailerUsername') setMailerUsername(value)
    else if (stateName === 'mailerPassword') setMailerPassword(value)
    else if (stateName === 'mailerFrom') setMailerFrom(value)
  }, [])

  const onMailerSubmit = useCallback(
    e => {
      e.preventDefault()

      const mailSettings = [
        { name: 'mailer:host', value: mailerHost },
        { name: 'mailer:port', value: mailerPort },
        { name: 'mailer:username', value: mailerUsername },
        { name: 'mailer:password', value: mailerPassword },
        { name: 'mailer:from', value: mailerFrom },
        { name: 'mailer:ssl', value: mailerSSL }
      ]

      updateMultipleSettings(mailSettings)
    },
    [mailerHost, mailerPort, mailerUsername, mailerPassword, mailerFrom, mailerSSL, updateMultipleSettings]
  )

  const testMailerSettings = useCallback(
    e => {
      e.preventDefault()
      helpers.UI.showSnackbar(t('settings.testing'))

      axios
        .post('/api/v1/settings/testmailer', {})
        .then(() => {
          helpers.UI.showSnackbar(t('settings.successfullyConnected'))
        })
        .catch(err => {
          if (!err.response) return Log.error(err)
          helpers.UI.showSnackbar(t('settings.connectionFailed'), true)
          Log.error(err.response.data.error, err.response)
        })
    },
    [t]
  )

  return (
    <SettingItem
      title={t('settings.mailerTitle')}
      subtitle={t('settings.mailerHint')}
      component={
        <EnableSwitch
          stateName='mailerEnabled'
          label={t('settings.enabled')}
          onChange={e => onEnableMailerChanged(e)}
          checked={getSetting('mailerEnabled')}
        />
      }
    >
      <form onSubmit={e => onMailerSubmit(e)}>
        <div className='uk-margin-medium-bottom'>
          <div className='uk-right'>
            <EnableSwitch
              stateName='mailerSSL'
              label={t('settings.useSSL')}
              style={{ position: 'absolute', top: '5px', right: '-5px', zIndex: '99', margin: '0' }}
              checked={mailerSSL}
              disabled={!getSetting('mailerEnabled')}
              onChange={e => onMailerSSLChanged(e)}
            />
          </div>
          <label>{t('settings.mailServer')}</label>
          <input
            type='text'
            className='md-input md-input-width-medium'
            name='mailerHost'
            disabled={!getSetting('mailerEnabled')}
            value={mailerHost}
            onChange={e => onInputValueChanged(e, 'mailerHost')}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <label>{t('settings.port')}</label>
          <input
            type='text'
            className='md-input md-input-width-medium'
            name='mailerPort'
            disabled={!getSetting('mailerEnabled')}
            value={mailerPort}
            onChange={e => onInputValueChanged(e, 'mailerPort')}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <label>{t('settings.authUsername')}</label>
          <input
            type='text'
            className='md-input md-input-width-medium'
            name='mailerUsername'
            disabled={!getSetting('mailerEnabled')}
            value={mailerUsername}
            onChange={e => onInputValueChanged(e, 'mailerUsername')}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <label>{t('settings.authPassword')}</label>
          <input
            type='password'
            className='md-input md-input-width-medium'
            name='mailerPassword'
            disabled={!getSetting('mailerEnabled')}
            value={mailerPassword}
            onChange={e => onInputValueChanged(e, 'mailerPassword')}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <label>{t('settings.fromAddress')}</label>
          <input
            type='text'
            className='md-input md-input-width-medium'
            name='mailerFrom'
            disabled={!getSetting('mailerEnabled')}
            value={mailerFrom}
            onChange={e => onInputValueChanged(e, 'mailerFrom')}
          />
        </div>
        <div className='uk-clearfix'>
          <Button
            text={t('settings.testSettings')}
            type='button'
            flat
            waves
            style='primary'
            extraClass='uk-float-left'
            disabled={!getSetting('mailerEnabled')}
            onClick={e => testMailerSettings(e)}
          />
          <Button
            text={t('settings.apply')}
            type='submit'
            style='success'
            extraClass='uk-float-right'
            disabled={!getSetting('mailerEnabled')}
            waves
            flat
          />
        </div>
      </form>
    </SettingItem>
  )
}

MailerSettingsMailer.propTypes = {
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(
  mapStateToProps,
  { updateSetting, updateMultipleSettings }
)(MailerSettingsMailer))
