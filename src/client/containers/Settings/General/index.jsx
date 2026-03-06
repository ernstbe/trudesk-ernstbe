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
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import moment from 'moment-timezone'
import { updateSetting } from 'actions/settings'

import SettingItem from 'components/Settings/SettingItem'

import InputWithSave from 'components/Settings/InputWithSave'
import SingleSelect from 'components/SingleSelect'
import EnableSwitch from 'components/Settings/EnableSwitch'
import SettingSubItem from 'components/Settings/SettingSubItem'
import Zone from 'components/ZoneBox/zone'
import ZoneBox from 'components/ZoneBox'

class GeneralSettings extends React.Component {
  constructor (props) {
    super(props)
  }

  componentDidMount () {}
  componentWillUnmount () {}

  getSettingsValue (name) {
    return this.props.settings.getIn(['settings', name, 'value'])
      ? this.props.settings.getIn(['settings', name, 'value'])
      : ''
  }

  updateSetting (stateName, name, value) {
    this.props.updateSetting({ stateName, name, value })
  }

  getTimezones () {
    return moment.tz
      .names()
      .map(function (name) {
        const year = new Date().getUTCFullYear()
        const timezoneAtBeginningOfyear = moment.tz(year + '-01-01', name)
        return {
          utc: timezoneAtBeginningOfyear.utcOffset(),
          text: '(GMT' + timezoneAtBeginningOfyear.format('Z') + ') ' + name,
          value: name
        }
      })
      .sort(function (a, b) {
        return a.utc - b.utc
      })
  }

  onTimezoneChange (e) {
    if (e.target.value) this.updateSetting('timezone', 'gen:timezone', e.target.value)
  }

  render () {
    const { active, t } = this.props

    const SiteTitle = (
      <InputWithSave
        stateName='siteTitle'
        settingName='gen:sitetitle'
        initialValue={this.getSettingsValue('siteTitle')}
      />
    )

    const SiteUrl = (
      <InputWithSave stateName='siteUrl' settingName='gen:siteurl' initialValue={this.getSettingsValue('siteUrl')} />
    )

    const Timezone = (
      <SingleSelect
        stateName='timezone'
        settingName='gen:timezone'
        items={this.getTimezones()}
        defaultValue={this.getSettingsValue('timezone')}
        onSelectChange={e => {
          this.onTimezoneChange(e)
        }}
        showTextbox={true}
      />
    )

    return (
      <div className={active ? 'active' : 'hide'}>
        <SettingItem
          title={t('settings.siteTitle')}
          subtitle={
            <div>
              {t('settings.siteTitleHint')} <i>{t('settings.siteTitleDefault')}</i>
            </div>
          }
          component={SiteTitle}
        />
        <SettingItem
          title={t('settings.siteUrl')}
          subtitle={
            <div>
              {t('settings.siteUrlHint')} <i>ex: {this.props.viewdata.get('hosturl')}</i>
            </div>
          }
          component={SiteUrl}
        />
        <SettingItem
          title={t('settings.serverTimezone')}
          subtitle={t('settings.serverTimezoneHint')}
          tooltip={t('settings.serverTimezoneTooltip')}
          component={Timezone}
        />
        <SettingItem
          title={t('settings.timeDateFormat')}
          subtitle={
            <a href='https://momentjs.com/docs/#/displaying/format/' rel='noopener noreferrer' target='_blank'>
              {t('settings.momentFormatOptions')}
            </a>
          }
        >
          <Zone>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.timeFormat')}
                subtitle={t('settings.timeFormatHint')}
                component={
                  <InputWithSave
                    stateName='timeFormat'
                    settingName='gen:timeFormat'
                    initialValue={this.getSettingsValue('timeFormat')}
                    width={'60%'}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.shortDateFormat')}
                subtitle={t('settings.shortDateFormatHint')}
                component={
                  <InputWithSave
                    stateName='shortDateFormat'
                    settingName='gen:shortDateFormat'
                    initialValue={this.getSettingsValue('shortDateFormat')}
                    width={'60%'}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.longDateFormat')}
                subtitle={t('settings.longDateFormatHint')}
                component={
                  <InputWithSave
                    stateName='longDateFormat'
                    settingName='gen:longDateFormat'
                    initialValue={this.getSettingsValue('longDateFormat')}
                    width={'60%'}
                  />
                }
              />
            </ZoneBox>
          </Zone>
        </SettingItem>
      </div>
    )
  }
}

GeneralSettings.propTypes = {
  active: PropTypes.bool,
  updateSetting: PropTypes.func.isRequired,
  viewdata: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  viewdata: state.common.viewdata,
  settings: state.settings.settings
})

export default withTranslation()(connect(mapStateToProps, { updateSetting })(GeneralSettings))
