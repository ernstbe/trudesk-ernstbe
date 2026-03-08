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
 *  Updated:    2/9/19 1:37 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import Button from 'components/Button'
import EasyMDE from 'components/EasyMDE'
import { updateSetting } from 'actions/settings'

import helpers from 'lib/helpers'
import SettingItem from 'components/Settings/SettingItem'

const LegalSettingsContainer = ({ active, settings, updateSetting, t }) => {
  const [privacyPolicy, setPrivacyPolicy] = useState('')

  const getSetting = useCallback(
    name => {
      return settings.getIn(['settings', name, 'value']) ? settings.getIn(['settings', name, 'value']) : ''
    },
    [settings]
  )

  const onSavePrivacyPolicyClicked = useCallback(
    e => {
      e.preventDefault()
      console.log(privacyPolicy)
      updateSetting({
        stateName: 'privacyPolicy',
        name: 'legal:privacypolicy',
        value: privacyPolicy,
        noSnackbar: true
      }).then(() => {
        helpers.UI.showSnackbar('Privacy Policy Updated')
      })
    },
    [privacyPolicy, updateSetting]
  )

  return (
    <div className={!active ? 'hide' : ''}>
      <SettingItem title={t('settings.privacyPolicy')} subtitle={t('settings.privacyPolicyHint')}>
        <div>
          <EasyMDE
            defaultValue={getSetting('privacyPolicy')}
            onChange={v => setPrivacyPolicy(v)}
          />
        </div>
        <div className='uk-clearfix'>
          <Button
            text={t('common.save')}
            extraClass='uk-float-right'
            flat
            style='success'
            waves
            onClick={e => onSavePrivacyPolicyClicked(e)}
          />
        </div>
      </SettingItem>
    </div>
  )
}

LegalSettingsContainer.propTypes = {
  active: PropTypes.bool,
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(mapStateToProps, { updateSetting })(LegalSettingsContainer))
