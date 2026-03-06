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

import React from 'react'
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

class Mailer_MailerCheck extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      mailerCheckHost: '',
      mailerCheckPort: '',
      mailerCheckUsername: '',
      mailerCheckPassword: '',
      mailerCheckSelfSign: '',
      mailerCheckPolling: '',
      mailerCheckCreateAccount: '',
      mailerCheckDeleteMessage: '',
      mailerCheckTicketType: '',
      mailerCheckTicketPriority: '',

      typePriorities: []
    }
  }

  componentDidMount () {
    helpers.UI.inputs()
  }

  componentDidUpdate () {
    helpers.UI.reRenderInputs()
  }

  static getDerivedStateFromProps (nextProps, state) {
    // Load those settings Up to state!
    if (nextProps.settings) {
      let stateObj = { ...state }
      if (!state.mailerCheckHost)
        stateObj.mailerCheckHost = nextProps.settings.getIn(['settings', 'mailerCheckHost', 'value']) || ''
      if (!state.mailerCheckPort)
        stateObj.mailerCheckPort = nextProps.settings.getIn(['settings', 'mailerCheckPort', 'value']) || ''
      if (!state.mailerCheckUsername)
        stateObj.mailerCheckUsername = nextProps.settings.getIn(['settings', 'mailerCheckUsername', 'value']) || ''
      if (!state.mailerCheckPassword)
        stateObj.mailerCheckPassword = nextProps.settings.getIn(['settings', 'mailerCheckPassword', 'value']) || ''
      if (state.mailerCheckSelfSign === '')
        stateObj.mailerCheckSelfSign = nextProps.settings.getIn(['settings', 'mailerCheckSelfSign', 'value']) || ''
      if (state.mailerCheckPolling === '')
        stateObj.mailerCheckPolling =
          parseInt(nextProps.settings.getIn(['settings', 'mailerCheckPolling', 'value'])) / 60000 || ''
      if (state.mailerCheckCreateAccount === '')
        stateObj.mailerCheckCreateAccount =
          nextProps.settings.getIn(['settings', 'mailerCheckCreateAccount', 'value']) || ''
      if (state.mailerCheckDeleteMessage === '')
        stateObj.mailerCheckDeleteMessage =
          nextProps.settings.getIn(['settings', 'mailerCheckDeleteMessage', 'value']) || ''
      if (!state.mailerCheckTicketType)
        stateObj.mailerCheckTicketType = nextProps.settings.getIn(['settings', 'mailerCheckTicketType', 'value']) || ''
      if (stateObj.mailerCheckTicketType)
        stateObj.typePriorities = Mailer_MailerCheck.getTypePriorities(
          nextProps.settings.get('ticketTypes'),
          stateObj.mailerCheckTicketType
        )
      if (!state.mailerCheckTicketPriority)
        stateObj.mailerCheckTicketPriority =
          nextProps.settings.getIn(['settings', 'mailerCheckTicketPriority', 'value']) || ''

      return stateObj
    }

    return null
  }

  getSetting (stateName) {
    return this.props.settings.getIn(['settings', stateName, 'value'])
      ? this.props.settings.getIn(['settings', stateName, 'value'])
      : ''
  }

  getTicketTypes () {
    return this.props.settings.get('ticketTypes') ? this.props.settings.get('ticketTypes').toArray() : []
  }

  static getTypePriorities (ticketTypes, typeId) {
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

  onFormSubmit (e) {
    e.preventDefault()

    const mailCheckSettings = [
      { name: 'mailer:check:polling', value: this.state.mailerCheckPolling * 60000 },
      { name: 'mailer:check:host', value: this.state.mailerCheckHost },
      { name: 'mailer:check:port', value: this.state.mailerCheckPort },
      { name: 'mailer:check:username', value: this.state.mailerCheckUsername },
      { name: 'mailer:check:password', value: this.state.mailerCheckPassword },
      { name: 'mailer:check:selfsign', value: this.state.mailerCheckSelfSign },
      { name: 'mailer:check:ticketype', value: this.state.mailerCheckTicketType },
      { name: 'mailer:check:ticketpriority', value: this.state.mailerCheckTicketPriority },
      { name: 'mailer:check:createaccount', value: this.state.mailerCheckCreateAccount },
      { name: 'mailer:check:deletemessage', value: this.state.mailerCheckDeleteMessage }
    ]

    this.props.updateMultipleSettings(mailCheckSettings)
  }

  onEnableMailerCheckChanged (e) {
    const { t } = this.props
    this.props
      .updateSetting({
        name: 'mailer:check:enable',
        stateName: 'mailerCheckEnabled',
        value: e.target.checked,
        noSnackbar: true
      })
      .then(() => {
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
  }

  onInputValueChanged (e, stateName) {
    this.setState({
      [stateName]: e.target.value
    })
  }

  onPollingChanged (e) {
    this.setState({
      mailerCheckPolling: e.target.value
    })
  }

  onCheckboxChanged (e, stateName) {
    this.setState({
      [stateName]: e.target.checked
    })
  }

  onTicketTypeSelectChanged (e) {
    this.setState({
      mailerCheckTicketType: e.target.value,
      typePriorities: Mailer_MailerCheck.getTypePriorities(this.props.settings.get('ticketTypes'), e.target.value)
    })
  }

  onSingleSelectChanged (e, stateName) {
    this.setState({
      [stateName]: e.target.value
    })
  }

  onCheckNowClicked (e) {
    const { t } = this.props
    axios
      .get(`/api/v2/mailer/check`)
      .then(function (res) {
        if (res.data && res.data.success) helpers.UI.showSnackbar(t('settings.fetchMailScheduled'))
      })
      .catch(function (err) {
        Log.error(err)
        helpers.UI.showSnackbar(err, true)
      })
  }

  render () {
    const { t } = this.props
    const mappedTicketTypes = this.getTicketTypes().map(type => {
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
            stateName={'mailerCheckEnabled'}
            label={t('settings.enabled')}
            checked={this.getSetting('mailerCheckEnabled')}
            onChange={e => this.onEnableMailerCheckChanged(e)}
          />
        }
      >
        <div>
          <form onSubmit={e => this.onFormSubmit(e)}>
            <div className='uk-margin-medium-bottom'>
              <label>{t('settings.mailServer')}</label>
              <input
                type='text'
                className={'md-input md-input-width-medium'}
                name={'mailerCheckHost'}
                value={this.state.mailerCheckHost}
                onChange={e => this.onInputValueChanged(e, 'mailerCheckHost')}
                disabled={!this.getSetting('mailerCheckEnabled')}
              />
            </div>
            <div className='uk-margin-medium-bottom'>
              <label>{t('settings.port')}</label>
              <input
                type='text'
                className={'md-input md-input-width-medium'}
                name={'mailerCheckPort'}
                value={this.state.mailerCheckPort}
                onChange={e => this.onInputValueChanged(e, 'mailerCheckPort')}
                disabled={!this.getSetting('mailerCheckEnabled')}
              />
            </div>
            <div className='uk-margin-medium-bottom'>
              <label>{t('common.username')}</label>
              <input
                type='text'
                className={'md-input md-input-width-medium'}
                name={'mailerCheckUsername'}
                value={this.state.mailerCheckUsername}
                onChange={e => this.onInputValueChanged(e, 'mailerCheckUsername')}
                disabled={!this.getSetting('mailerCheckEnabled')}
              />
            </div>
            <div className='uk-margin-medium-bottom'>
              <label>{t('common.password')}</label>
              <input
                type='password'
                className={'md-input md-input-width-medium'}
                name={'mailerCheckPassword'}
                value={this.state.mailerCheckPassword}
                onChange={e => this.onInputValueChanged(e, 'mailerCheckPassword')}
                disabled={!this.getSetting('mailerCheckEnabled')}
              />
            </div>
            <div className='uk-clearfix uk-margin-medium-bottom'>
              <div className='uk-float-left'>
                <h6 style={{ padding: 0, margin: '5px 0 0 0', fontSize: '16px', lineHeight: '14px' }}>
                  {t('settings.allowSelfSignedCert')}
                </h6>
                <h5
                  style={{ padding: '0 0 10px 0', margin: '2px 0 0 0', fontSize: '12px' }}
                  className={'uk-text-muted'}
                >
                  {t('settings.allowSelfSignedCertHint')}
                </h5>
              </div>
              <div className='uk-float-right'>
                <EnableSwitch
                  label={t('settings.enable')}
                  stateName={'mailerCheckSelfSign'}
                  checked={this.state.mailerCheckSelfSign}
                  onChange={e => this.onCheckboxChanged(e, 'mailerCheckSelfSign')}
                  disabled={!this.getSetting('mailerCheckEnabled')}
                />
              </div>
              <hr style={{ float: 'left', marginTop: '10px' }} />
            </div>
            <div className='uk-clearfix uk-margin-medium-bottom'>
              <div className='uk-float-left'>
                <h6 style={{ padding: 0, margin: '5px 0 0 0', fontSize: '16px', lineHeight: '14px' }}>
                  {t('settings.pollingInterval')}
                  <i
                    className={'material-icons'}
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
                  className={'uk-text-muted'}
                >
                  {t('settings.pollingIntervalHint')}
                </h5>
              </div>
              <div className='uk-float-right' style={{ position: 'relative' }}>
                <div className='uk-float-left' style={{ width: '90px', paddingRight: '10px' }}>
                  <input
                    type={'number'}
                    className={'md-input md-input-width-small'}
                    name={'mailerCheckPolling'}
                    disabled={!this.getSetting('mailerCheckEnabled')}
                    value={this.state.mailerCheckPolling}
                    onChange={e => this.onPollingChanged(e)}
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
                  className={'uk-text-muted'}
                >
                  {t('settings.createAccountHint')}
                </h5>
              </div>
              <div className='uk-float-right'>
                <EnableSwitch
                  label={t('settings.enable')}
                  stateName={'mailerCheckCreateAccount'}
                  checked={this.state.mailerCheckCreateAccount}
                  onChange={e => this.onCheckboxChanged(e, 'mailerCheckCreateAccount')}
                  disabled={!this.getSetting('mailerCheckEnabled')}
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
                  className={'uk-text-muted'}
                >
                  {t('settings.deleteMessageHint')}
                </h5>
              </div>
              <div className='uk-float-right'>
                <EnableSwitch
                  label={t('settings.enable')}
                  stateName={'mailerCheckDeleteMessage'}
                  checked={this.state.mailerCheckDeleteMessage}
                  onChange={e => this.onCheckboxChanged(e, 'mailerCheckDeleteMessage')}
                  disabled={!this.getSetting('mailerCheckEnabled')}
                />
              </div>
              <hr style={{ float: 'left', marginTop: '10px' }} />
            </div>
            <div className='uk-margin-medium-bottom uk-clearfix'>
              <label>{t('settings.defaultTicketType')}</label>
              <SingleSelect
                showTextbox={false}
                width={'100%'}
                items={mappedTicketTypes}
                defaultValue={this.state.mailerCheckTicketType}
                disabled={!this.getSetting('mailerCheckEnabled')}
                onSelectChange={e => this.onTicketTypeSelectChanged(e)}
              />
            </div>
            <div className='uk-margin-medium-bottom uk-clearfix'>
              <label>{t('settings.defaultTicketPriority')}</label>
              <SingleSelect
                showTextbox={false}
                width={'100%'}
                items={this.state.typePriorities}
                defaultValue={this.state.mailerCheckTicketPriority}
                disabled={!this.getSetting('mailerCheckEnabled')}
                onSelectChange={e => this.onSingleSelectChanged(e, 'mailerCheckTicketPriority')}
              />
            </div>
            <div className='uk-clearfix'>
              <Button
                text={t('settings.checkNow')}
                type={'button'}
                extraClass={'uk-float-left'}
                flat={true}
                waves={true}
                style={'primary'}
                onClick={e => this.onCheckNowClicked(e)}
                disabled={!this.getSetting('mailerCheckEnabled')}
              />
              <Button
                text={t('settings.apply')}
                type={'submit'}
                extraClass={'uk-float-right'}
                flat={true}
                waves={true}
                style={'success'}
                disabled={!this.getSetting('mailerCheckEnabled')}
              />
            </div>
          </form>
        </div>
      </SettingItem>
    )
  }
}

Mailer_MailerCheck.propTypes = {
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(mapStateToProps, { updateSetting, updateMultipleSettings })(Mailer_MailerCheck))
