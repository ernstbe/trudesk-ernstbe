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

import { updateSetting, updateMultipleSettings, updateColorScheme } from 'actions/settings'
import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import UploadButtonWithX from 'components/Settings/UploadButtonWithX'
import SettingSubItem from 'components/Settings/SettingSubItem'
import SingleSelect from 'components/SingleSelect'
import ColorSelector from 'components/ColorSelector'
import Zone from 'components/ZoneBox/zone'
import ZoneBox from 'components/ZoneBox'

const colorMap = {
  light: {
    headerBG: '#42464d',
    headerPrimary: '#f6f7f8',
    primary: '#606771',
    secondary: '#f7f8fa',
    tertiary: '#e74c3c',
    quaternary: '#e6e7e8'
  },
  dark: {
    headerBG: '#242a31',
    headerPrimary: '#f6f7f8',
    primary: '#f6f7f8',
    secondary: '#2f3640',
    tertiary: '#e74c3c',
    quaternary: '#454f5d'
  },
  bluejean: {
    headerBG: '#112d4e',
    headerPrimary: '#f9f7f7',
    primary: '#112d4e',
    secondary: '#f9f7f7',
    tertiary: '#3f72af',
    quaternary: '#dbe2ef'
  },
  midnight: {
    headerBG: '#2c2e3e',
    headerPrimary: '#f6f6f6',
    primary: '#444a54',
    secondary: '#c8c8c8',
    tertiary: '#ee2b47',
    quaternary: '#2c2e3e'
  },
  moonlight: {
    headerBG: '#2e3238',
    headerPrimary: '#eeeeee',
    primary: '#444a54',
    secondary: '#c8c8c8',
    tertiary: '#7971ea',
    quaternary: '#444a54'
  },
  purplerain: {
    headerBG: '#393041',
    headerPrimary: '#f6f6f6',
    primary: '#393041',
    secondary: '#d2cbd8',
    tertiary: '#f67280',
    quaternary: '#52455f'
  },
  sandstone: {
    headerBG: '#625757',
    headerPrimary: '#f9f9f9',
    primary: '#625757',
    secondary: '#dfdfdf',
    tertiary: '#ef5a5a',
    quaternary: '#6f6363'
  },
  winterfire: {
    headerBG: '#404969',
    headerPrimary: '#ebf0f6',
    primary: '#404969',
    secondary: '#ebf0f6',
    tertiary: '#ff7f50',
    quaternary: '#4a5479'
  }
}

class AppearanceSettings extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      selectedColorScheme: 'light'
    }
  }

  componentDidUpdate () {
    const colorScheme = this.calcColorScheme()
    if (this.state.selectedColorScheme !== colorScheme)
      this.setState({
        selectedColorScheme: colorScheme
      })
  }

  getSettingsValue (name) {
    return this.props.settings.getIn(['settings', name, 'value'])
      ? this.props.settings.getIn(['settings', name, 'value'])
      : ''
  }

  updateSetting (name, value, stateName) {
    this.props.updateSetting({ name, value, stateName })
  }

  calcColorScheme () {
    let colorScheme = 'light'
    if (this.getSettingsValue('colorSecondary') === '#2f3640') colorScheme = 'dark'
    else if (this.getSettingsValue('colorHeaderBG') === '#112d4e') colorScheme = 'bluejean'
    else if (this.getSettingsValue('colorTertiary') === '#ee2b47') colorScheme = 'midnight'
    else if (this.getSettingsValue('colorHeaderBG') === '#2e3238') colorScheme = 'moonlight'
    else if (this.getSettingsValue('colorTertiary') === '#f67280') colorScheme = 'purplerain'
    else if (this.getSettingsValue('colorHeaderBG') === '#625757') colorScheme = 'sandstone'
    else if (this.getSettingsValue('colorHeaderBG') === '#404969') colorScheme = 'winterfire'

    return colorScheme
  }

  onBuiltInColorSelectChange (e) {
    if (!e.target || !e.target.value) return
    this.headerBGColorSelect.setState(
      { selectedColor: colorMap[e.target.value].headerBG },
      this.headerBGColorSelect.updateColorButton
    )
    this.headerPrimaryColorSelect.setState(
      { selectedColor: colorMap[e.target.value].headerPrimary },
      this.headerPrimaryColorSelect.updateColorButton
    )
    this.primaryColorSelect.setState(
      { selectedColor: colorMap[e.target.value].primary },
      this.primaryColorSelect.updateColorButton
    )
    this.secondaryColorSelect.setState(
      { selectedColor: colorMap[e.target.value].secondary },
      this.secondaryColorSelect.updateColorButton
    )
    this.tertiaryColorSelect.setState(
      { selectedColor: colorMap[e.target.value].tertiary },
      this.tertiaryColorSelect.updateColorButton
    )
    this.quaternaryColorSelect.setState(
      { selectedColor: colorMap[e.target.value].quaternary },
      this.quaternaryColorSelect.updateColorButton
    )
  }

  saveColorScheme () {
    const colors = [
      { name: 'color:headerbg', value: this.headerBGColorSelect.state.selectedColor },
      { name: 'color:headerprimary', value: this.headerPrimaryColorSelect.state.selectedColor },
      { name: 'color:primary', value: this.primaryColorSelect.state.selectedColor },
      { name: 'color:secondary', value: this.secondaryColorSelect.state.selectedColor },
      { name: 'color:tertiary', value: this.tertiaryColorSelect.state.selectedColor },
      { name: 'color:quaternary', value: this.quaternaryColorSelect.state.selectedColor }
    ]

    this.props.updateColorScheme(colors)
  }

  render () {
    const { active, t } = this.props

    return (
      <div className={active ? 'active' : 'hide'}>
        <SettingItem
          title={t('settings.siteLogo')}
          subtitle={
            <div>
              {t('settings.siteLogoHint')} <i>{t('settings.siteLogoNote')}</i>
            </div>
          }
          component={
            <UploadButtonWithX
              buttonText={t('settings.uploadLogo')}
              uploadAction={'/settings/general/uploadlogo'}
              extAllowed={'*.(jpg|jpeg|gif|png)'}
              showX={this.getSettingsValue('hasCustomLogo')}
              onXClick={() => {
                this.updateSetting('gen:customlogo', false, 'hasCustomLogo')
                setTimeout(() => {
                  window.location.reload()
                }, 1000)
              }}
            />
          }
        />

        <SettingItem
          title={t('settings.pageLogo')}
          subtitle={
            <div>
              {t('settings.pageLogoHint')} <i>{t('settings.pageLogoNote')}</i>
            </div>
          }
          component={
            <UploadButtonWithX
              buttonText={t('settings.uploadLogo')}
              uploadAction={'/settings/general/uploadpagelogo'}
              extAllowed={'*.(jpg|jpeg|gif|png)'}
              showX={this.getSettingsValue('hasCustomPageLogo')}
              onXClick={() => {
                this.updateSetting('gen:custompagelogo', false, 'hasCustomPageLogo')
              }}
            />
          }
        />

        <SettingItem
          title={t('settings.favicon')}
          subtitle={t('settings.faviconHint')}
          component={
            <UploadButtonWithX
              buttonText={t('settings.uploadFavicon')}
              uploadAction={'/settings/general/uploadfavicon'}
              extAllowed={'*.(jpg|jpeg|gif|png|ico)'}
              showX={this.getSettingsValue('hasCustomFavicon')}
              onXClick={() => {
                this.updateSetting('gen:customfavicon', false, 'hasCustomFavicon')
                setTimeout(() => {
                  window.location.reload()
                }, 1000)
              }}
            />
          }
        />
        <SettingItem
          title={t('settings.colorScheme')}
          subtitle={t('settings.colorSchemeHint')}
          component={
            <Button
              text={t('common.save')}
              flat={true}
              style={'success'}
              extraClass={'uk-float-right mt-10'}
              onClick={() => {
                this.saveColorScheme()
              }}
            />
          }
        >
          <Zone>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.builtInColorScheme')}
                subtitle={t('settings.builtInColorSchemeHint')}
                component={
                  <SingleSelect
                    width='60%'
                    showTextbox={false}
                    items={[
                      { text: 'Light (Default)', value: 'light' },
                      { text: 'Dark', value: 'dark' },
                      { text: 'Blue Jean', value: 'bluejean' },
                      { text: 'Midnight', value: 'midnight' },
                      { text: 'Moonlight', value: 'moonlight' },
                      { text: 'Purple Rain', value: 'purplerain' },
                      { text: 'Sandstone', value: 'sandstone' },
                      { text: "Winter's Fire", value: 'winterfire' }
                    ]}
                    defaultValue={this.state.selectedColorScheme}
                    onSelectChange={e => {
                      this.onBuiltInColorSelectChange(e)
                    }}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.headerBackground')}
                subtitle={t('settings.headerBackgroundHint')}
                component={
                  <ColorSelector
                    ref={cs => {
                      this.headerBGColorSelect = cs
                    }}
                    defaultColor={this.getSettingsValue('colorHeaderBG')}
                    parentClass={'uk-width-2-3 uk-float-right'}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.headerPrimary')}
                subtitle={t('settings.headerPrimaryHint')}
                component={
                  <ColorSelector
                    ref={cs => {
                      this.headerPrimaryColorSelect = cs
                    }}
                    defaultColor={this.getSettingsValue('colorHeaderPrimary')}
                    parentClass={'uk-width-2-3 uk-float-right'}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.colorPrimary')}
                subtitle={t('settings.colorPrimaryHint')}
                component={
                  <ColorSelector
                    ref={cs => {
                      this.primaryColorSelect = cs
                    }}
                    defaultColor={this.getSettingsValue('colorPrimary')}
                    parentClass={'uk-width-2-3 uk-float-right'}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.colorSecondary')}
                subtitle={t('settings.colorSecondaryHint')}
                component={
                  <ColorSelector
                    ref={cs => {
                      this.secondaryColorSelect = cs
                    }}
                    defaultColor={this.getSettingsValue('colorSecondary')}
                    parentClass={'uk-width-2-3 uk-float-right'}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.colorTertiary')}
                subtitle={t('settings.colorTertiaryHint')}
                component={
                  <ColorSelector
                    ref={cs => {
                      this.tertiaryColorSelect = cs
                    }}
                    defaultColor={this.getSettingsValue('colorTertiary')}
                    parentClass={'uk-width-2-3 uk-float-right'}
                  />
                }
              />
            </ZoneBox>
            <ZoneBox>
              <SettingSubItem
                title={t('settings.colorQuaternary')}
                subtitle={t('settings.colorQuaternaryHint')}
                component={
                  <ColorSelector
                    ref={cs => {
                      this.quaternaryColorSelect = cs
                    }}
                    defaultColor={this.getSettingsValue('colorQuaternary')}
                    parentClass={'uk-width-2-3 uk-float-right'}
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

AppearanceSettings.propTypes = {
  active: PropTypes.bool,
  settings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  updateMultipleSettings: PropTypes.func.isRequired,
  updateColorScheme: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(mapStateToProps, { updateSetting, updateMultipleSettings, updateColorScheme })(
  AppearanceSettings
))
