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
 *  Updated:    2/6/19 6:21 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import { fetchSettings } from 'actions/settings'

import Menu from 'components/Settings/Menu'
import MenuItem from 'components/Settings/MenuItem'
import GeneralSettings from './General'
import AccountsSettings from './Accounts'
import AppearanceSettings from './Appearance'
import PermissionsSettingsContainer from './Permissions'
import TicketsSettings from './Tickets'
import MailerSettingsContainer from './Mailer'
import ElasticsearchSettingsContainer from './Elasticsearch'
// import TPSSettingsContainer from './TPS'
import BackupRestoreSettingsContainer from './BackupRestore'
import ServerSettingsController from './Server'
import LegalSettingsContainer from 'containers/Settings/Legal'

import helpers from 'lib/helpers'

const SettingsContainer = ({ fetchSettings, t }) => {
  const [activeCategory, setActiveCategory] = useState('settings-general')
  const pageRef = useRef(null)

  useEffect(() => {
    const location = window.location.pathname.replace(/^(\/settings(\/?))/, '')
    if (location) {
      setActiveCategory('settings-' + location)
    }

    fetchSettings()

    helpers.resizeAll()
  }, [])

  const onMenuItemClick = useCallback((e, category) => {
    setActiveCategory(prev => {
      if (prev === 'settings-' + category) return prev
      if (pageRef.current) pageRef.current.scrollTop = 0
      return 'settings-' + category
    })
  }, [])

  return (
    <div className='uk-grid uk-grid-collapse'>
      <div className='uk-width-1-6 uk-width-xLarge-1-10 message-list full-height' data-offset='68'>
        <div
          className='page-title noshadow nopadding-right'
          style={{ borderTop: 'none', borderBottom: 'none', height: '68px', paddingLeft: '20px' }}
        >
          <div style={{ position: 'relative' }}>
            <p style={{ fontSize: '24px' }}>{t('settings.title')}</p>
          </div>
        </div>
        <div className='page-content-left noborder full-height'>
          <Menu>
            <MenuItem
              title={t('settings.general')}
              active={activeCategory === 'settings-general'}
              onClick={e => {
                onMenuItemClick(e, 'general')
              }}
            />
            <MenuItem
              title={t('accounts.title')}
              active={activeCategory === 'settings-accounts'}
              onClick={e => {
                onMenuItemClick(e, 'accounts')
              }}
            />
            <MenuItem
              title={t('settings.appearance')}
              active={activeCategory === 'settings-appearance'}
              onClick={e => {
                onMenuItemClick(e, 'appearance')
              }}
            />
            <MenuItem
              title={t('settings.permissions')}
              active={activeCategory === 'settings-permissions'}
              onClick={e => {
                onMenuItemClick(e, 'permissions')
              }}
            />
            <MenuItem
              title={t('nav.tickets')}
              active={activeCategory === 'settings-tickets'}
              onClick={e => {
                onMenuItemClick(e, 'tickets')
              }}
            />
            <MenuItem
              title={t('settings.mailer')}
              active={activeCategory === 'settings-mailer'}
              onClick={e => {
                onMenuItemClick(e, 'mailer')
              }}
            />
            <MenuItem
              title='Elasticsearch'
              active={activeCategory === 'settings-elasticsearch'}
              onClick={e => {
                onMenuItemClick(e, 'elasticsearch')
              }}
            />
            <MenuItem
              title={t('settings.backup')}
              active={activeCategory === 'settings-backup'}
              onClick={e => {
                onMenuItemClick(e, 'backup')
              }}
            />
            <MenuItem
              title={t('settings.server')}
              active={activeCategory === 'settings-server'}
              onClick={e => {
                onMenuItemClick(e, 'server')
              }}
            />
            <MenuItem
              title={t('settings.legal')}
              active={activeCategory === 'settings-legal'}
              onClick={e => {
                onMenuItemClick(e, 'legal')
              }}
            />
          </Menu>
        </div>
      </div>
      <div className='uk-width-5-6 uk-width-xLarge-9-10'>
        <div
          className='page-title-right noshadow page-title-border-bottom'
          style={{ borderTop: 'none', height: '69px' }}
        />
        <div className='page-wrapper full-height scrollable no-overflow-x' ref={pageRef}>
          <div className='settings-wrap'>
            <GeneralSettings active={activeCategory === 'settings-general'} />
            <AccountsSettings active={activeCategory === 'settings-accounts'} />
            <AppearanceSettings active={activeCategory === 'settings-appearance'} />
            <PermissionsSettingsContainer active={activeCategory === 'settings-permissions'} />
            <TicketsSettings active={activeCategory === 'settings-tickets'} />
            <MailerSettingsContainer active={activeCategory === 'settings-mailer'} />
            <ElasticsearchSettingsContainer active={activeCategory === 'settings-elasticsearch'} />
            <BackupRestoreSettingsContainer active={activeCategory === 'settings-backup'} />
            <ServerSettingsController active={activeCategory === 'settings-server'} />
            <LegalSettingsContainer active={activeCategory === 'settings-legal'} />
          </div>
        </div>
      </div>
    </div>
  )
}

SettingsContainer.propTypes = {
  fetchSettings: PropTypes.func.isRequired,
  sidebar: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  sidebar: state.sidebar
})

export default withTranslation()(connect(mapStateToProps, { fetchSettings })(SettingsContainer))
