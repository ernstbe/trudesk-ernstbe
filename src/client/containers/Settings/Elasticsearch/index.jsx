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
 *  Updated:    4/14/19 2:25 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { observer } from 'mobx-react'
import { makeObservable, observable } from 'mobx'
import { updateSetting, updateMultipleSettings } from 'actions/settings'

import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import EnableSwitch from 'components/Settings/EnableSwitch'

import Log from '../../../logger'
import axios from 'axios'
import helpers from 'lib/helpers'
import UIKit from 'uikit'

@observer
class ElasticsearchSettingsContainer extends React.Component {
  @observable esStatus = 'Not Configured'
  @observable esStatusClass = ''
  @observable indexCount = 0
  @observable inSyncText = 'Not Configured'
  @observable inSyncClass = ''
  @observable disableRebuild = false

  constructor (props) {
    super(props)
    makeObservable(this)

    this.state = {
      host: false,
      port: '',

      configured: false
    }

    this.getStatus = this.getStatus.bind(this)
    this.rebuildIndex = this.rebuildIndex.bind(this)
  }

  componentDidMount () {
    helpers.UI.inputs()
  }

  componentDidUpdate () {
    helpers.UI.reRenderInputs()

    if (!this.loaded && this.state.configured) {
      this.getStatus()
      this.loaded = true
    }
  }

  static getDerivedStateFromProps (nextProps, state) {
    if (nextProps.settings) {
      let stateObj = { ...state }
      if (state.host === false)
        stateObj.host = nextProps.settings.getIn(['settings', 'elasticSearchHost', 'value']) || false
      if (!state.port) stateObj.port = nextProps.settings.getIn(['settings', 'elasticSearchPort', 'value']) || ''

      if (!state.configured)
        stateObj.configured = nextProps.settings.getIn(['settings', 'elasticSearchConfigured', 'value']) || false

      return stateObj
    }

    return null
  }

  getSetting (name) {
    return this.props.settings.getIn(['settings', name, 'value'])
      ? this.props.settings.getIn(['settings', name, 'value'])
      : ''
  }

  onEnableChanged (e) {
    const checked = e.target.checked
    const self = this
    this.props
      .updateSetting({
        stateName: 'elasticSearchEnabled',
        name: 'es:enable',
        value: checked,
        noSnackbar: true
      })
      .then(() => {
        if (checked && this.state.host && this.state.port) {
          this.setState({ configured: true }, () => {
            this.getStatus()
          })
        } else {
          this.setState({ configured: false }, () => {
            self.esStatus = 'Not Configured'
            self.esStatusClass = ''
            self.inSyncText = 'Not Configured'
            self.inSyncClass = ''
            self.indexCount = 0
          })
        }
      })
  }

  onInputChanged (e, settingName) {
    this.setState({
      [settingName]: e.target.value
    })
  }

  onFormSubmit (e) {
    e.preventDefault()

    const payload = [
      { name: 'es:host', value: this.state.host },
      { name: 'es:port', value: this.state.port }
    ]

    this.props.updateMultipleSettings(payload)
  }

  getStatus () {
    const self = this
    // self.esStatus = 'Please Wait...'
    // self.inSyncText = 'Please Wait...'
    // if (!this.state.configured) {
    //   this.esStatus = 'Not Configured'
    //   this.indexCount = 0
    //   this.inSyncText = 'Not Configured'
    //   this.inSyncClass = ''
    //
    //   return false
    // }

    axios
      .get('/api/v2/es/status')
      .then(res => {
        const data = res.data
        if (data.status.isRebuilding) {
          self.esStatus = 'Rebuilding...'
          self.esStatusClass = ''
        } else self.esStatus = data.status.esStatus
        if (self.esStatus.toLowerCase() === 'connected') self.esStatusClass = 'text-success'
        else if (self.esStatus.toLowerCase() === 'error') self.esStatusClass = 'text-danger'

        self.indexCount = data.status.indexCount.toLocaleString()
        if (data.status.inSync) {
          self.inSyncText = 'In Sync'
          self.inSyncClass = 'bg-success'
        } else {
          self.inSyncText = 'Out of Sync'
          self.inSyncClass = 'bg-warn'
        }

        if (data.status.isRebuilding) {
          setTimeout(self.getStatus, 3000)
          self.disableRebuild = true
        } else self.disableRebuild = false
      })
      .catch(err => {
        this.esStatus = 'Error'
        this.esStatusClass = 'text-danger'
        this.inSyncText = 'Unknown'
        this.inSyncClass = ''
        if (err.error && err.error.message) helpers.UI.showSnackbar('Error: ' + err.error.message, true)
        else helpers.UI.showSnackbar('Error: An unknown error occurred. Check Console.', true)
        Log.error(err)
      })
  }

  rebuildIndex () {
    const self = this
    const { t } = this.props
    UIKit.modal.confirm(
      t('settings.confirmRebuildIndex'),
      function () {
        self.esStatus = t('settings.rebuilding')
        self.inSyncText = t('settings.outOfSync')
        self.inSyncClass = 'bg-warn'
        self.indexCount = 0
        axios
          .get('/api/v2/es/rebuild')
          .then(() => {
            self.esStatus = t('settings.rebuilding')
            // $scope.esStatusClass = 'text-warning';
            helpers.UI.showSnackbar(t('settings.rebuildingIndex'), false)
            self.disableRebuild = true
            setTimeout(self.getStatus, 3000)
          })
          .catch(function (err) {
            Log.error('[trudesk:settings:es:RebuildIndex]', err)
            helpers.UI.showSnackbar('Error: An unknown error occurred. Check Console.', true)
          })
      },
      {
        labels: { Ok: t('common.yes'), Cancel: t('common.no') },
        confirmButtonClass: 'md-btn-danger'
      }
    )
  }

  render () {
    const { t } = this.props
    return (
      <div className={this.props.active ? '' : 'hide'}>
        <SettingItem
          title={t('settings.elasticsearchBeta')}
          subtitle={t('settings.elasticsearchHint')}
          component={
            <EnableSwitch
              stateName={'elasticSearchEnabled'}
              label={t('settings.enable')}
              checked={this.getSetting('elasticSearchEnabled')}
              onChange={e => this.onEnableChanged(e)}
            />
          }
        />
        <SettingItem
          title={t('settings.connectionStatus')}
          subtitle={t('settings.connectionStatusHint')}
          component={<h4 className={`right mr-15 mt-15 ${this.esStatusClass}`}>{this.esStatus}</h4>}
        />
        <SettingItem
          title={t('settings.indexedDocuments')}
          subtitle={t('settings.indexedDocumentsHint')}
          component={<h4 className={'right mr-15 mt-15'}>{this.indexCount}</h4>}
        />
        <SettingItem
          title={t('settings.indexStatus')}
          subtitle={t('settings.indexStatusHint')}
          extraClass={this.inSyncClass}
          component={<h4 className={'right mr-15 mt-15'}>{this.inSyncText}</h4>}
        />
        <SettingItem
          title={t('settings.esServerConfig')}
          tooltip={t('settings.esServerConfigTooltip')}
          subtitle={t('settings.esServerConfigHint')}
        >
          <form onSubmit={e => this.onFormSubmit(e)}>
            <div className='uk-margin-medium-bottom'>
              <label>{t('settings.server')}</label>
              <input
                type='text'
                className={'md-input md-input-width-medium'}
                value={this.state.host}
                disabled={!this.getSetting('elasticSearchEnabled')}
                onChange={e => this.onInputChanged(e, 'host')}
              />
            </div>
            <div className='uk-margin-medium-bottom'>
              <label>{t('settings.port')}</label>
              <input
                type='text'
                className={'md-input md-input-width-medium'}
                value={this.state.port}
                disabled={!this.getSetting('elasticSearchEnabled')}
                onChange={e => this.onInputChanged(e, 'port')}
              />
            </div>
            <div className='uk-clearfix'>
              <Button
                text={t('settings.apply')}
                type={'submit'}
                flat={true}
                waves={true}
                disabled={!this.getSetting('elasticSearchEnabled')}
                style={'success'}
                extraClass={'uk-float-right'}
              />
            </div>
          </form>
        </SettingItem>
        <SettingItem
          title={t('settings.rebuildIndex')}
          subtitle={t('settings.rebuildIndexHint')}
          tooltip={t('settings.rebuildIndexTooltip')}
          component={
            <Button
              text={t('settings.rebuild')}
              flat={false}
              waves={true}
              style={'primary'}
              extraClass={'right mt-8 mr-5'}
              disabled={this.disableRebuild}
              onClick={this.rebuildIndex}
            />
          }
        />
      </div>
    )
  }
}

ElasticsearchSettingsContainer.propTypes = {
  active: PropTypes.bool.isRequired,
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(mapStateToProps, { updateSetting, updateMultipleSettings })(ElasticsearchSettingsContainer))
