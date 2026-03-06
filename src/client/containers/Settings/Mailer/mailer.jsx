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

import React from 'react'
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

class MailerSettings_Mailer extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      mailerSSL: '',
      mailerHost: '',
      mailerPort: '',
      mailerUsername: '',
      mailerPassword: '',
      mailerFrom: ''
    }
  }

  componentDidMount () {
    helpers.UI.inputs()
  }

  componentDidUpdate () {
    helpers.UI.reRenderInputs()
  }

  static getDerivedStateFromProps (nextProps, state) {
    if (nextProps.settings) {
      let stateObj = { ...state }
      if (state.mailerSSL === '')
        stateObj.mailerSSL = nextProps.settings.getIn(['settings', 'mailerSSL', 'value']) || ''
      if (!state.mailerHost) stateObj.mailerHost = nextProps.settings.getIn(['settings', 'mailerHost', 'value']) || ''
      if (!state.mailerPort) stateObj.mailerPort = nextProps.settings.getIn(['settings', 'mailerPort', 'value']) || ''
      if (!state.mailerUsername)
        stateObj.mailerUsername = nextProps.settings.getIn(['settings', 'mailerUsername', 'value']) || ''
      if (!state.mailerPassword)
        stateObj.mailerPassword = nextProps.settings.getIn(['settings', 'mailerPassword', 'value']) || ''
      if (!state.mailerFrom) stateObj.mailerFrom = nextProps.settings.getIn(['settings', 'mailerFrom', 'value']) || ''

      return stateObj
    }

    return null
  }

  getSetting (name) {
    return this.props.settings.getIn(['settings', name, 'value'])
      ? this.props.settings.getIn(['settings', name, 'value'])
      : ''
  }

  onEnableMailerChanged (e) {
    this.props.updateSetting({
      name: 'mailer:enable',
      stateName: 'mailerEnabled',
      value: e.target.checked,
      noSnackbar: true
    })
  }

  onMailerSSLChanged (e) {
    this.setState({
      mailerSSL: e.target.checked
    })
  }

  onInputValueChanged (e, stateName) {
    this.setState({
      [stateName]: e.target.value
    })
  }

  onMailerSubmit (e) {
    e.preventDefault()

    const mailSettings = [
      { name: 'mailer:host', value: this.state.mailerHost },
      { name: 'mailer:port', value: this.state.mailerPort },
      { name: 'mailer:username', value: this.state.mailerUsername },
      { name: 'mailer:password', value: this.state.mailerPassword },
      { name: 'mailer:from', value: this.state.mailerFrom },
      { name: 'mailer:ssl', value: this.state.mailerSSL }
    ]

    this.props.updateMultipleSettings(mailSettings)
  }

  testMailerSettings (e) {
    e.preventDefault()
    const { t } = this.props
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
  }

  render () {
    const { t } = this.props
    return (
      <SettingItem
        title={t('settings.mailerTitle')}
        subtitle={t('settings.mailerHint')}
        component={
          <EnableSwitch
            stateName={'mailerEnabled'}
            label={t('settings.enabled')}
            onChange={e => this.onEnableMailerChanged(e)}
            checked={this.getSetting('mailerEnabled')}
          />
        }
      >
        <form onSubmit={e => this.onMailerSubmit(e)}>
          <div className={'uk-margin-medium-bottom'}>
            <div className={'uk-right'}>
              <EnableSwitch
                stateName={'mailerSSL'}
                label={t('settings.useSSL')}
                style={{ position: 'absolute', top: '5px', right: '-5px', zIndex: '99', margin: '0' }}
                checked={this.state.mailerSSL}
                disabled={!this.getSetting('mailerEnabled')}
                onChange={e => this.onMailerSSLChanged(e)}
              />
            </div>
            <label>{t('settings.mailServer')}</label>
            <input
              type='text'
              className={'md-input md-input-width-medium'}
              name={'mailerHost'}
              disabled={!this.getSetting('mailerEnabled')}
              value={this.state.mailerHost}
              onChange={e => this.onInputValueChanged(e, 'mailerHost')}
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label>{t('settings.port')}</label>
            <input
              type='text'
              className={'md-input md-input-width-medium'}
              name={'mailerPort'}
              disabled={!this.getSetting('mailerEnabled')}
              value={this.state.mailerPort}
              onChange={e => this.onInputValueChanged(e, 'mailerPort')}
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label>{t('settings.authUsername')}</label>
            <input
              type='text'
              className={'md-input md-input-width-medium'}
              name={'mailerUsername'}
              disabled={!this.getSetting('mailerEnabled')}
              value={this.state.mailerUsername}
              onChange={e => this.onInputValueChanged(e, 'mailerUsername')}
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label>{t('settings.authPassword')}</label>
            <input
              type='password'
              className={'md-input md-input-width-medium'}
              name={'mailerPassword'}
              disabled={!this.getSetting('mailerEnabled')}
              value={this.state.mailerPassword}
              onChange={e => this.onInputValueChanged(e, 'mailerPassword')}
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label>{t('settings.fromAddress')}</label>
            <input
              type='text'
              className={'md-input md-input-width-medium'}
              name={'mailerFrom'}
              disabled={!this.getSetting('mailerEnabled')}
              value={this.state.mailerFrom}
              onChange={e => this.onInputValueChanged(e, 'mailerFrom')}
            />
          </div>
          <div className='uk-clearfix'>
            <Button
              text={t('settings.testSettings')}
              type={'button'}
              flat={true}
              waves={true}
              style={'primary'}
              extraClass={'uk-float-left'}
              disabled={!this.getSetting('mailerEnabled')}
              onClick={e => this.testMailerSettings(e)}
            />
            <Button
              text={t('settings.apply')}
              type={'submit'}
              style={'success'}
              extraClass={'uk-float-right'}
              disabled={!this.getSetting('mailerEnabled')}
              waves={true}
              flat={true}
            />
          </div>
        </form>
      </SettingItem>
    )
  }
}

MailerSettings_Mailer.propTypes = {
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
)(MailerSettings_Mailer))
