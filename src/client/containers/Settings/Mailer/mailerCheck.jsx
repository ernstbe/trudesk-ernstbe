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
 *  Updated:    2/7/19 1:41 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { updateSetting, updateMultipleSettings } from 'actions/settings'
import Log from '../../../logger'

import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import EnableSwitch from 'components/Settings/EnableSwitch'
import SingleSelect from 'components/SingleSelect'

import UIKit from 'uikit'
import axios from 'axios'
import helpers from 'lib/helpers'

function getTypePriorities (ticketTypes, typeId) {
  if (!ticketTypes && !typeId) return []
  return ticketTypes
    .filter(item => {
      return item.get('_id') === typeId
    })
    .first()
    .get('priorities')
    .map(p => {
      return { text: p.get('name'), value: p.get('_id') }
    })
    .toArray()
}

const MailerMailerCheck = ({ settings, updateSetting, updateMultipleSettings, t }) => {
  const [mailerCheckHost, setMailerCheckHost] = useState('')
  const [mailerCheckPort, setMailerCheckPort] = useState('')
  const [mailerCheckUsername, setMailerCheckUsername] = useState('')
  const [mailerCheckPassword, setMailerCheckPassword] = useState('')
  const [mailerCheckSelfSign, setMailerCheckSelfSign] = useState('')
  const [mailerCheckPolling, setMailerCheckPolling] = useState('')
  const [mailerCheckCreateAccount, setMailerCheckCreateAccount] = useState('')
  const [mailerCheckDeleteMessage, setMailerCheckDeleteMessage] = useState('')
  const [mailerCheckTicketType, setMailerCheckTicketType] = useState('')
  const [mailerCheckTicketPriority, setMailerCheckTicketPriority] = useState('')
  const [typePriorities, setTypePriorities] = useState([])

  useEffect(() => {
    helpers.UI.inputs()
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()
  })

  useEffect(() => {
    if (settings) {
      if (!mailerCheckHost) setMailerCheckHost(settings.getIn(['settings', 'mailerCheckHost', 'value']) || '')
      if (!mailerCheckPort) setMailerCheckPort(settings.getIn(['settings', 'mailerCheckPort', 'value']) || '')
      if (!mailerCheckUsername) { setMailerCheckUsername(settings.getIn(['settings', 'mailerCheckUsername', 'value']) || '') }
      if (!mailerCheckPassword) { setMailerCheckPassword(settings.getIn(['settings', 'mailerCheckPassword', 'value']) || '') }
      if (mailerCheckSelfSign === '') { setMailerCheckSelfSign(settings.getIn(['settings', 'mailerCheckSelfSign', 'value']) || '') }
      if (mailerCheckPolling === '') {
        setMailerCheckPolling(
          parseInt(settings.getIn(['settings', 'mailerCheckPolling', 'value'])) / 60000 || ''
        )
      }
      if (mailerCheckCreateAccount === '') {
        setMailerCheckCreateAccount(
          settings.getIn(['settings', 'mailerCheckCreateAccount', 'value']) || ''
        )
      }
      if (mailerCheckDeleteMessage === '') {
        setMailerCheckDeleteMessage(
          settings.getIn(['settings', 'mailerCheckDeleteMessage', 'value']) || ''
        )
      }
      let ticketType = mailerCheckTicketType
      if (!mailerCheckTicketType) {
        ticketType = settings.getIn(['settings', 'mailerCheckTicketType', 'value']) || ''
        setMailerCheckTicketType(ticketType)
      }
      if (ticketType) setTypePriorities(getTypePriorities(settings.get('ticketTypes'), ticketType))
      if (!mailerCheckTicketPriority) {
        setMailerCheckTicketPriority(
          settings.getIn(['settings', 'mailerCheckTicketPriority', 'value']) || ''
        )
      }
    }
  }, [settings])

  const getSetting = useCallback(
    stateName => {
      return settings.getIn(['settings', stateName, 'value'])
        ? settings.getIn(['settings', stateName, 'value'])
        : ''
    },
    [settings]
  )

  const getTicketTypes = useCallback(() => {
    return settings.get('ticketTypes') ? settings.get('ticketTypes').toArray() : []
  }, [settings])

  const onFormSubmit = useCallback(
    e => {
      e.preventDefault()

      const mailCheckSettings = [
        { name: 'mailer:check:polling', value: mailerCheckPolling * 60000 },
        { name: 'mailer:check:host', value: mailerCheckHost },
        { name: 'mailer:check:port', value: mailerCheckPort },
        { name: 'mailer:check:username', value: mailerCheckUsername },
        { name: 'mailer:check:password', value: mailerCheckPassword },
        { name: 'mailer:check:selfsign', value: mailerCheckSelfSign },
        { name: 'mailer:check:ticketype', value: mailerCheckTicketType },
        { name: 'mailer:check:ticketpriority', value: mailerCheckTicketPriority },
        { name: 'mailer:check:createaccount', value: mailerCheckCreateAccount },
        { name: 'mailer:check:deletemessage', value: mailerCheckDeleteMessage }
      ]

      updateMultipleSettings(mailCheckSettings)
    },
    [
      mailerCheckPolling,
      mailerCheckHost,
      mailerCheckPort,
      mailerCheckUsername,
      mailerCheckPassword,
      mailerCheckSelfSign,
      mailerCheckTicketType,
      mailerCheckTicketPriority,
      mailerCheckCreateAccount,
      mailerCheckDeleteMessage,
      updateMultipleSettings
    ]
  )

  const onEnableMailerCheckChanged = useCallback(
    e => {
      updateSetting({
        name: 'mailer:check:enable',
        stateName: 'mailerCheckEnabled',
        value: e.target.checked,
        noSnackbar: true
      }).then(() => {
        UIKit.modal.confirm(
          t('settings.restartConfirm'),
          () => {
            axios.get('/api/v1/admin/restart').catch(error => {
              helpers.hideLoader()
              Log.error(error.response)
              Log.error('Unable to restart server. Server must run under PM2 and Account must have admin rights.')
              helpers.UI.showSnackbar('Unable to restart server. Are you an Administrator?', true)
            })
          },
          {
            labels: { Ok: t('common.yes'), Cancel: t('common.no') },
            confirmButtonClass: 'md-btn-primary'
          }
        )
      })
    },
    [updateSetting, t]
  )

  const onInputValueChanged = useCallback((e, stateName) => {
    const value = e.target.value
    if (stateName === 'mailerCheckHost') setMailerCheckHost(value)
    else if (stateName === 'mailerCheckPort') setMailerCheckPort(value)
    else if (stateName === 'mailerCheckUsername') setMailerCheckUsername(value)
    else if (stateName === 'mailerCheckPassword') setMailerCheckPassword(value)
  }, [])

  const onPollingChanged = useCallback(e => {
    setMailerCheckPolling(e.target.value)
  }, [])

  const onCheckboxChanged = useCallback((e, stateName) => {
    const checked = e.target.checked
    if (stateName === 'mailerCheckSelfSign') setMailerCheckSelfSign(checked)
    else if (stateName === 'mailerCheckCreateAccount') setMailerCheckCreateAccount(checked)
    else if (stateName === 'mailerCheckDeleteMessage') setMailerCheckDeleteMessage(checked)
  }, [])

  const onTicketTypeSelectChanged = useCallback(
    e => {
      setMailerCheckTicketType(e.target.value)
      setTypePriorities(getTypePriorities(settings.get('ticketTypes'), e.target.value))
    },
    [settings]
  )

  const onSingleSelectChanged = useCallback((e, stateName) => {
    if (stateName === 'mailerCheckTicketPriority') setMailerCheckTicketPriority(e.target.value)
  }, [])

  const onCheckNowClicked = useCallback(
    e => {
      axios
        .get('/api/v2/mailer/check')
        .then(function (res) {
          if (res.data && res.data.success) helpers.UI.showSnackbar(t('settings.fetchMailScheduled'))
        })
        .catch(function (err) {
          Log.error(err)
          helpers.UI.showSnackbar(err, true)
        })
    },
    [t]
  )

  const mappedTicketTypes = getTicketTypes().map(type => {
    return { text: type.get('name'), value: type.get('_id') }
  })

  return (
    <SettingItem
      title={t('settings.mailerCheck')}
      subtitle={
        <div>
          {t('settings.mailerCheckHint')} - <i>{t('settings.settingsAppliedAfterRestart')}</i>
        </div>
      }
      component={
        <EnableSwitch
          stateName='mailerCheckEnabled'
          label={t('settings.enabled')}
          checked={getSetting('mailerCheckEnabled')}
          onChange={e => onEnableMailerCheckChanged(e)}
        />
      }
    >
      <div>
        <form onSubmit={e => onFormSubmit(e)}>
          <div className='uk-margin-medium-bottom'>
            <label>{t('settings.mailServer')}</label>
            <input
              type='text'
              className='md-input md-input-width-medium'
              name='mailerCheckHost'
              value={mailerCheckHost}
              onChange={e => onInputValueChanged(e, 'mailerCheckHost')}
              disabled={!getSetting('mailerCheckEnabled')}
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label>{t('settings.port')}</label>
            <input
              type='text'
              className='md-input md-input-width-medium'
              name='mailerCheckPort'
              value={mailerCheckPort}
              onChange={e => onInputValueChanged(e, 'mailerCheckPort')}
              disabled={!getSetting('mailerCheckEnabled')}
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label>{t('common.username')}</label>
            <input
              type='text'
              className='md-input md-input-width-medium'
              name='mailerCheckUsername'
              value={mailerCheckUsername}
              onChange={e => onInputValueChanged(e, 'mailerCheckUsername')}
              disabled={!getSetting('mailerCheckEnabled')}
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label>{t('common.password')}</label>
            <input
              type='password'
              className='md-input md-input-width-medium'
              name='mailerCheckPassword'
              value={mailerCheckPassword}
              onChange={e => onInputValueChanged(e, 'mailerCheckPassword')}
              disabled={!getSetting('mailerCheckEnabled')}
            />
          </div>
          <div className='uk-clearfix uk-margin-medium-bottom'>
            <div className='uk-float-left'>
              <h6 style={{ padding: 0, margin: '5px 0 0 0', fontSize: '16px', lineHeight: '14px' }}>
                {t('settings.allowSelfSignedCert')}
              </h6>
              <h5
                style={{ padding: '0 0 10px 0', margin: '2px 0 0 0', fontSize: '12px' }}
                className='uk-text-muted'
              >
                {t('settings.allowSelfSignedCertHint')}
              </h5>
            </div>
            <div className='uk-float-right'>
              <EnableSwitch
                label={t('settings.enable')}
                stateName='mailerCheckSelfSign'
                checked={mailerCheckSelfSign}
                onChange={e => onCheckboxChanged(e, 'mailerCheckSelfSign')}
                disabled={!getSetting('mailerCheckEnabled')}
              />
            </div>
            <hr style={{ float: 'left', marginTop: '10px' }} />
          </div>
          <div className='uk-clearfix uk-margin-medium-bottom'>
            <div className='uk-float-left'>
              <h6 style={{ padding: 0, margin: '5px 0 0 0', fontSize: '16px', lineHeight: '14px' }}>
                {t('settings.pollingInterval')}
                <i
                  className='material-icons'
                  style={{
                    color: '#888',
                    fontSize: '16px',
                    cursor: 'pointer',
                    lineHeight: '20px',
                    marginLeft: '5px'
                  }}
                  data-uk-tooltip="{cls:'long-text'}"
                  title={t('settings.pollingIntervalTooltip')}
                >
                  error
                </i>
              </h6>
              <h5
                style={{ padding: '0 0 10px 0', margin: '2px 0 0 0', fontSize: '12px' }}
                className='uk-text-muted'
              >
                {t('settings.pollingIntervalHint')}
              </h5>
            </div>
            <div className='uk-float-right' style={{ position: 'relative' }}>
              <div className='uk-float-left' style={{ width: '90px', paddingRight: '10px' }}>
                <input
                  type='number'
                  className='md-input md-input-width-small'
                  name='mailerCheckPolling'
                  disabled={!getSetting('mailerCheckEnabled')}
                  value={mailerCheckPolling}
                  onChange={e => onPollingChanged(e)}
                />
              </div>
            </div>
            <hr style={{ float: 'left', marginTop: '10px' }} />
          </div>
          <div className='uk-clearfix uk-margin-medium-bottom'>
            <div className='uk-float-left'>
              <h6 style={{ padding: 0, margin: '5px 0 0 0', fontSize: '16px', lineHeight: '14px' }}>
                {t('settings.createAccount')}
              </h6>
              <h5
                style={{ padding: '0 0 10px 0', margin: '2px 0 0 0', fontSize: '12px' }}
                className='uk-text-muted'
              >
                {t('settings.createAccountHint')}
              </h5>
            </div>
            <div className='uk-float-right'>
              <EnableSwitch
                label={t('settings.enable')}
                stateName='mailerCheckCreateAccount'
                checked={mailerCheckCreateAccount}
                onChange={e => onCheckboxChanged(e, 'mailerCheckCreateAccount')}
                disabled={!getSetting('mailerCheckEnabled')}
              />
            </div>
            <hr style={{ float: 'left', marginTop: '10px' }} />
          </div>
          <div className='uk-clearfix uk-margin-medium-bottom'>
            <div className='uk-float-left'>
              <h6 style={{ padding: 0, margin: '5px 0 0 0', fontSize: '16px', lineHeight: '14px' }}>
                {t('settings.deleteMessage')}
              </h6>
              <h5
                style={{ padding: '0 0 10px 0', margin: '2px 0 0 0', fontSize: '12px' }}
                className='uk-text-muted'
              >
                {t('settings.deleteMessageHint')}
              </h5>
            </div>
            <div className='uk-float-right'>
              <EnableSwitch
                label={t('settings.enable')}
                stateName='mailerCheckDeleteMessage'
                checked={mailerCheckDeleteMessage}
                onChange={e => onCheckboxChanged(e, 'mailerCheckDeleteMessage')}
                disabled={!getSetting('mailerCheckEnabled')}
              />
            </div>
            <hr style={{ float: 'left', marginTop: '10px' }} />
          </div>
          <div className='uk-margin-medium-bottom uk-clearfix'>
            <label>{t('settings.defaultTicketType')}</label>
            <SingleSelect
              showTextbox={false}
              width='100%'
              items={mappedTicketTypes}
              defaultValue={mailerCheckTicketType}
              disabled={!getSetting('mailerCheckEnabled')}
              onSelectChange={e => onTicketTypeSelectChanged(e)}
            />
          </div>
          <div className='uk-margin-medium-bottom uk-clearfix'>
            <label>{t('settings.defaultTicketPriority')}</label>
            <SingleSelect
              showTextbox={false}
              width='100%'
              items={typePriorities}
              defaultValue={mailerCheckTicketPriority}
              disabled={!getSetting('mailerCheckEnabled')}
              onSelectChange={e => onSingleSelectChanged(e, 'mailerCheckTicketPriority')}
            />
          </div>
          <div className='uk-clearfix'>
            <Button
              text={t('settings.checkNow')}
              type='button'
              extraClass='uk-float-left'
              flat
              waves
              style='primary'
              onClick={e => onCheckNowClicked(e)}
              disabled={!getSetting('mailerCheckEnabled')}
            />
            <Button
              text={t('settings.apply')}
              type='submit'
              extraClass='uk-float-right'
              flat
              waves
              style='success'
              disabled={!getSetting('mailerCheckEnabled')}
            />
          </div>
        </form>
      </div>
    </SettingItem>
  )
}

MailerMailerCheck.propTypes = {
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(mapStateToProps, { updateSetting, updateMultipleSettings })(MailerMailerCheck))
