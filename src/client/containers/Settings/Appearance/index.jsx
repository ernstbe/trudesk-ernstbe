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

import React, { useState, useEffect, useCallback, useRef } from 'react'
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

const AppearanceSettings = ({ active, settings, updateSetting, updateMultipleSettings, updateColorScheme, t }) => {
  const [selectedColorScheme, setSelectedColorScheme] = useState('light')

  const headerBGColorSelectRef = useRef(null)
  const headerPrimaryColorSelectRef = useRef(null)
  const primaryColorSelectRef = useRef(null)
  const secondaryColorSelectRef = useRef(null)
  const tertiaryColorSelectRef = useRef(null)
  const quaternaryColorSelectRef = useRef(null)

  const getSettingsValue = useCallback(
    name => {
      return settings.getIn(['settings', name, 'value']) ? settings.getIn(['settings', name, 'value']) : ''
    },
    [settings]
  )

  const calcColorScheme = useCallback(() => {
    let colorScheme = 'light'
    if (getSettingsValue('colorSecondary') === '#2f3640') colorScheme = 'dark'
    else if (getSettingsValue('colorHeaderBG') === '#112d4e') colorScheme = 'bluejean'
    else if (getSettingsValue('colorTertiary') === '#ee2b47') colorScheme = 'midnight'
    else if (getSettingsValue('colorHeaderBG') === '#2e3238') colorScheme = 'moonlight'
    else if (getSettingsValue('colorTertiary') === '#f67280') colorScheme = 'purplerain'
    else if (getSettingsValue('colorHeaderBG') === '#625757') colorScheme = 'sandstone'
    else if (getSettingsValue('colorHeaderBG') === '#404969') colorScheme = 'winterfire'

    return colorScheme
  }, [getSettingsValue])

  useEffect(() => {
    const colorScheme = calcColorScheme()
    if (selectedColorScheme !== colorScheme) setSelectedColorScheme(colorScheme)
  })

  const doUpdateSetting = useCallback(
    (name, value, stateName) => {
      updateSetting({ name, value, stateName })
    },
    [updateSetting]
  )

  const onBuiltInColorSelectChange = useCallback(e => {
    if (!e.target || !e.target.value) return
    headerBGColorSelectRef.current.setState(
      { selectedColor: colorMap[e.target.value].headerBG },
      headerBGColorSelectRef.current.updateColorButton
    )
    headerPrimaryColorSelectRef.current.setState(
      { selectedColor: colorMap[e.target.value].headerPrimary },
      headerPrimaryColorSelectRef.current.updateColorButton
    )
    primaryColorSelectRef.current.setState(
      { selectedColor: colorMap[e.target.value].primary },
      primaryColorSelectRef.current.updateColorButton
    )
    secondaryColorSelectRef.current.setState(
      { selectedColor: colorMap[e.target.value].secondary },
      secondaryColorSelectRef.current.updateColorButton
    )
    tertiaryColorSelectRef.current.setState(
      { selectedColor: colorMap[e.target.value].tertiary },
      tertiaryColorSelectRef.current.updateColorButton
    )
    quaternaryColorSelectRef.current.setState(
      { selectedColor: colorMap[e.target.value].quaternary },
      quaternaryColorSelectRef.current.updateColorButton
    )
  }, [])

  const saveColorScheme = useCallback(() => {
    const colors = [
      { name: 'color:headerbg', value: headerBGColorSelectRef.current.state.selectedColor },
      { name: 'color:headerprimary', value: headerPrimaryColorSelectRef.current.state.selectedColor },
      { name: 'color:primary', value: primaryColorSelectRef.current.state.selectedColor },
      { name: 'color:secondary', value: secondaryColorSelectRef.current.state.selectedColor },
      { name: 'color:tertiary', value: tertiaryColorSelectRef.current.state.selectedColor },
      { name: 'color:quaternary', value: quaternaryColorSelectRef.current.state.selectedColor }
    ]

    updateColorScheme(colors)
  }, [updateColorScheme])

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
            uploadAction='/settings/general/uploadlogo'
            extAllowed='*.(jpg|jpeg|gif|png)'
            showX={getSettingsValue('hasCustomLogo')}
            onXClick={() => {
              doUpdateSetting('gen:customlogo', false, 'hasCustomLogo')
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
            uploadAction='/settings/general/uploadpagelogo'
            extAllowed='*.(jpg|jpeg|gif|png)'
            showX={getSettingsValue('hasCustomPageLogo')}
            onXClick={() => {
              doUpdateSetting('gen:custompagelogo', false, 'hasCustomPageLogo')
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
            uploadAction='/settings/general/uploadfavicon'
            extAllowed='*.(jpg|jpeg|gif|png|ico)'
            showX={getSettingsValue('hasCustomFavicon')}
            onXClick={() => {
              doUpdateSetting('gen:customfavicon', false, 'hasCustomFavicon')
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
            flat
            style='success'
            extraClass='uk-float-right mt-10'
            onClick={() => {
              saveColorScheme()
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
                  defaultValue={selectedColorScheme}
                  onSelectChange={e => {
                    onBuiltInColorSelectChange(e)
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
                  ref={headerBGColorSelectRef}
                  defaultColor={getSettingsValue('colorHeaderBG')}
                  parentClass='uk-width-2-3 uk-float-right'
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
                  ref={headerPrimaryColorSelectRef}
                  defaultColor={getSettingsValue('colorHeaderPrimary')}
                  parentClass='uk-width-2-3 uk-float-right'
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
                  ref={primaryColorSelectRef}
                  defaultColor={getSettingsValue('colorPrimary')}
                  parentClass='uk-width-2-3 uk-float-right'
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
                  ref={secondaryColorSelectRef}
                  defaultColor={getSettingsValue('colorSecondary')}
                  parentClass='uk-width-2-3 uk-float-right'
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
                  ref={tertiaryColorSelectRef}
                  defaultColor={getSettingsValue('colorTertiary')}
                  parentClass='uk-width-2-3 uk-float-right'
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
                  ref={quaternaryColorSelectRef}
                  defaultColor={getSettingsValue('colorQuaternary')}
                  parentClass='uk-width-2-3 uk-float-right'
                />
              }
            />
          </ZoneBox>
        </Zone>
      </SettingItem>
    </div>
  )
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
