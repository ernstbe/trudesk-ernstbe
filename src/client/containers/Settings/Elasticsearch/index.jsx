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

import React, { useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { updateSetting, updateMultipleSettings } from 'actions/settings'

import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import EnableSwitch from 'components/Settings/EnableSwitch'

import Log from '../../../logger'
import axios from 'axios'
import helpers from 'lib/helpers'
import UIKit from 'uikit'

const ElasticsearchSettingsContainer = ({ active, settings, updateSetting, updateMultipleSettings, t }) => {
  const [esStatus, setEsStatus] = useState('Not Configured')
  const [esStatusClass, setEsStatusClass] = useState('')
  const [indexCount, setIndexCount] = useState(0)
  const [inSyncText, setInSyncText] = useState('Not Configured')
  const [inSyncClass, setInSyncClass] = useState('')
  const [disableRebuild, setDisableRebuild] = useState(false)

  const [host, setHost] = useState(false)
  const [port, setPort] = useState('')
  const [configured, setConfigured] = useState(false)

  const loadedRef = useRef(false)

  const getStatusFn = useCallback(() => {
    axios
      .get('/api/v2/es/status')
      .then(res => {
        const data = res.data
        if (data.status.isRebuilding) {
          setEsStatus('Rebuilding...')
          setEsStatusClass('')
        } else setEsStatus(data.status.esStatus)
        if (data.status.esStatus && data.status.esStatus.toLowerCase() === 'connected') setEsStatusClass('text-success')
        else if (data.status.esStatus && data.status.esStatus.toLowerCase() === 'error') setEsStatusClass('text-danger')

        setIndexCount(data.status.indexCount.toLocaleString())
        if (data.status.inSync) {
          setInSyncText('In Sync')
          setInSyncClass('bg-success')
        } else {
          setInSyncText('Out of Sync')
          setInSyncClass('bg-warn')
        }

        if (data.status.isRebuilding) {
          setTimeout(getStatusFn, 3000)
          setDisableRebuild(true)
        } else setDisableRebuild(false)
      })
      .catch(err => {
        setEsStatus('Error')
        setEsStatusClass('text-danger')
        setInSyncText('Unknown')
        setInSyncClass('')
        if (err.error && err.error.message) helpers.UI.showSnackbar('Error: ' + err.error.message, true)
        else helpers.UI.showSnackbar('Error: An unknown error occurred. Check Console.', true)
        Log.error(err)
      })
  }, [])

  useEffect(() => {
    helpers.UI.inputs()
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()

    if (!loadedRef.current && configured) {
      getStatusFn()
      loadedRef.current = true
    }
  })

  useEffect(() => {
    if (settings) {
      if (host === false) setHost(settings.getIn(['settings', 'elasticSearchHost', 'value']) || false)
      if (!port) setPort(settings.getIn(['settings', 'elasticSearchPort', 'value']) || '')
      if (!configured) setConfigured(settings.getIn(['settings', 'elasticSearchConfigured', 'value']) || false)
    }
  }, [settings])

  const getSetting = useCallback(
    name => {
      return settings.getIn(['settings', name, 'value']) ? settings.getIn(['settings', name, 'value']) : ''
    },
    [settings]
  )

  const onEnableChanged = useCallback(
    e => {
      const checked = e.target.checked
      updateSetting({
        stateName: 'elasticSearchEnabled',
        name: 'es:enable',
        value: checked,
        noSnackbar: true
      }).then(() => {
        if (checked && host && port) {
          setConfigured(true)
          getStatusFn()
        } else {
          setConfigured(false)
          setEsStatus('Not Configured')
          setEsStatusClass('')
          setInSyncText('Not Configured')
          setInSyncClass('')
          setIndexCount(0)
        }
      })
    },
    [updateSetting, host, port, getStatusFn]
  )

  const onInputChanged = useCallback((e, settingName) => {
    if (settingName === 'host') setHost(e.target.value)
    else if (settingName === 'port') setPort(e.target.value)
  }, [])

  const onFormSubmit = useCallback(
    e => {
      e.preventDefault()

      const payload = [
        { name: 'es:host', value: host },
        { name: 'es:port', value: port }
      ]

      updateMultipleSettings(payload)
    },
    [host, port, updateMultipleSettings]
  )

  const rebuildIndex = useCallback(() => {
    UIKit.modal.confirm(
      t('settings.confirmRebuildIndex'),
      function () {
        setEsStatus(t('settings.rebuilding'))
        setInSyncText(t('settings.outOfSync'))
        setInSyncClass('bg-warn')
        setIndexCount(0)
        axios
          .get('/api/v2/es/rebuild')
          .then(() => {
            setEsStatus(t('settings.rebuilding'))
            helpers.UI.showSnackbar(t('settings.rebuildingIndex'), false)
            setDisableRebuild(true)
            setTimeout(getStatusFn, 3000)
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
  }, [t, getStatusFn])

  return (
    <div className={active ? '' : 'hide'}>
      <SettingItem
        title={t('settings.elasticsearchBeta')}
        subtitle={t('settings.elasticsearchHint')}
        component={
          <EnableSwitch
            stateName='elasticSearchEnabled'
            label={t('settings.enable')}
            checked={getSetting('elasticSearchEnabled')}
            onChange={e => onEnableChanged(e)}
          />
        }
      />
      <SettingItem
        title={t('settings.connectionStatus')}
        subtitle={t('settings.connectionStatusHint')}
        component={<h4 className={`right mr-15 mt-15 ${esStatusClass}`}>{esStatus}</h4>}
      />
      <SettingItem
        title={t('settings.indexedDocuments')}
        subtitle={t('settings.indexedDocumentsHint')}
        component={<h4 className='right mr-15 mt-15'>{indexCount}</h4>}
      />
      <SettingItem
        title={t('settings.indexStatus')}
        subtitle={t('settings.indexStatusHint')}
        extraClass={inSyncClass}
        component={<h4 className='right mr-15 mt-15'>{inSyncText}</h4>}
      />
      <SettingItem
        title={t('settings.esServerConfig')}
        tooltip={t('settings.esServerConfigTooltip')}
        subtitle={t('settings.esServerConfigHint')}
      >
        <form onSubmit={e => onFormSubmit(e)}>
          <div className='uk-margin-medium-bottom'>
            <label>{t('settings.server')}</label>
            <input
              type='text'
              className='md-input md-input-width-medium'
              value={host}
              disabled={!getSetting('elasticSearchEnabled')}
              onChange={e => onInputChanged(e, 'host')}
            />
          </div>
          <div className='uk-margin-medium-bottom'>
            <label>{t('settings.port')}</label>
            <input
              type='text'
              className='md-input md-input-width-medium'
              value={port}
              disabled={!getSetting('elasticSearchEnabled')}
              onChange={e => onInputChanged(e, 'port')}
            />
          </div>
          <div className='uk-clearfix'>
            <Button
              text={t('settings.apply')}
              type='submit'
              flat
              waves
              disabled={!getSetting('elasticSearchEnabled')}
              style='success'
              extraClass='uk-float-right'
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
            waves
            style='primary'
            extraClass='right mt-8 mr-5'
            disabled={disableRebuild}
            onClick={rebuildIndex}
          />
        }
      />
    </div>
  )
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
