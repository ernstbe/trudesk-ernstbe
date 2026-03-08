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

import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'
import { withTranslation } from 'react-i18next'
import SidebarItem from 'components/Nav/SidebarItem'
import NavSeparator from 'components/Nav/NavSeperator'
import Submenu from 'components/Nav/Submenu'
import SubmenuItem from 'components/Nav/SubmenuItem'
import LanguageSwitcher from 'components/LanguageSwitcher'

import { updateNavChange } from 'actions/nav'

import Helpers from 'lib/helpers'

const Sidebar = ({ updateNavChange, activeItem, activeSubItem, sessionUser, notice, t }) => {
  useEffect(() => {
    // Helpers.UI.getPlugins((err, result) => {
    //   if (!err && result.plugins) {
    //     this.setState({ plugins: result.plugins })
    //   }
    // })
    const sidebarRoute = document.getElementById('__sidebar_route').innerText
    const sidebarSubRoute = document.getElementById('__sidebar_sub_route').innerText

    updateNavChange({ activeItem: sidebarRoute, activeSubItem: sidebarSubRoute })
  }, [])

  useEffect(() => {
    Helpers.UI.initSidebar()
    Helpers.UI.bindExpand()
  })

  return (
    <div
      className='sidebar nopadding'
      style={{ overflowX: 'hidden', top: notice ? '95px' : '65px' }}
      data-scroll-opacitymax='0.1'
    >
      <div id='side-nav-container' style={{ minHeight: 'calc(100% - 50px)' }}>
        <ul className='side-nav'>
          {sessionUser && Helpers.canUser('agent:*', true) && (
            <SidebarItem
              text={t('nav.dashboard')}
              icon='dashboard'
              href='/dashboard'
              class='navHome'
              active={activeItem === 'dashboard'}
            />
          )}
          {sessionUser && Helpers.canUser('tickets:view') && (
            <SidebarItem
              text={t('nav.tickets')}
              icon='assignment'
              href='/tickets'
              class='navTickets no-ajaxy'
              hasSubmenu
              subMenuTarget='tickets'
              active={activeItem === 'tickets'}
            >
              <Submenu id='tickets'>
                <SubmenuItem
                  text={t('nav.ticketsActive')}
                  icon='timer'
                  href='/tickets/active'
                  active={activeSubItem === 'tickets-active'}
                />
                <SubmenuItem
                  text={t('nav.ticketsAssigned')}
                  icon='assignment_ind'
                  href='/tickets/assigned'
                  active={activeSubItem === 'tickets-assigned'}
                />
                <SubmenuItem
                  text={t('nav.ticketsUnassigned')}
                  icon='person_add_disabled'
                  href='/tickets/unassigned'
                  active={activeSubItem === 'tickets-unassigned'}
                />
              </Submenu>
            </SidebarItem>
          )}
          <SidebarItem
            text={t('nav.messages')}
            icon='chat'
            href='/messages'
            class='navMessages'
            active={activeItem === 'messages'}
          />
          {sessionUser && Helpers.canUser('accounts:view') && (
            <SidebarItem
              text={t('nav.accounts')}
              icon='&#xE7FD;'
              href='/accounts'
              class='navAccounts'
              active={activeItem === 'accounts'}
              subMenuTarget='accounts'
              hasSubmenu={sessionUser && Helpers.canUser('agent:*', true)}
            >
              {sessionUser && Helpers.canUser('agent:*', true) && (
                <Submenu id='accounts'>
                  <SubmenuItem
                    href='/accounts/customers'
                    text={t('accounts.customers')}
                    icon='account_box'
                    active={activeSubItem === 'accounts-customers'}
                  />
                  {sessionUser && Helpers.canUser('agent:*', true) && (
                    <SubmenuItem
                      href='/accounts/agents'
                      text={t('accounts.agents')}
                      icon='account_circle'
                      active={activeSubItem === 'accounts-agents'}
                    />
                  )}
                  {sessionUser && Helpers.canUser('admin:*') && (
                    <SubmenuItem
                      href='/accounts/admins'
                      text={t('accounts.admins')}
                      icon='how_to_reg'
                      active={activeSubItem === 'accounts-admins'}
                    />
                  )}
                </Submenu>
              )}
            </SidebarItem>
          )}
          {sessionUser && Helpers.canUser('groups:view') && (
            <SidebarItem
              text={t('teams.customerGroups', 'Customer Groups')}
              icon='supervisor_account'
              href='/groups'
              class='navGroups'
              active={activeItem === 'groups'}
            />
          )}
          {sessionUser && Helpers.canUser('teams:view') && (
            <SidebarItem text={t('nav.teams')} icon='wc' href='/teams' class='navTeams' active={activeItem === 'teams'} />
          )}
          {sessionUser && Helpers.canUser('departments:view') && (
            <SidebarItem
              text={t('nav.departments')}
              icon='domain'
              href='/departments'
              class='navTeams'
              active={activeItem === 'departments'}
            />
          )}
          {sessionUser && Helpers.canUser('reports:view') && (
            <SidebarItem
              text={t('nav.reports')}
              icon='assessment'
              href='/reports/generate'
              class='navReports no-ajaxy'
              hasSubmenu
              subMenuTarget='reports'
              active={activeItem === 'reports'}
            >
              <Submenu id='reports'>
                <SubmenuItem
                  text={t('reports.generate')}
                  icon='timeline'
                  href='/reports/generate'
                  active={activeSubItem === 'reports-generate'}
                />
                {/* <NavSeparator /> */}
                {/* <SubmenuItem */}
                {/*  text='Group Breakdown' */}
                {/*  icon='supervisor_account' */}
                {/*  href='/reports/breakdown/group' */}
                {/*  active={activeSubItem === 'reports-breakdown-group'} */}
                {/* /> */}
                {/* <SubmenuItem */}
                {/*  text='User Breakdown' */}
                {/*  icon='perm_identity' */}
                {/*  href='/reports/breakdown/user' */}
                {/*  active={activeSubItem === 'reports-breakdown-user'} */}
                {/* /> */}
              </Submenu>
            </SidebarItem>
          )}

          {/* {renderPlugins()} */}

          {sessionUser && Helpers.canUser('notices:view') && (
            <SidebarItem
              text={t('nav.notices')}
              icon='campaign'
              href='/notices'
              class='navNotices'
              active={activeItem === 'notices'}
            />
          )}

          {sessionUser && Helpers.canUser('settings:edit') && (
            <SidebarItem
              text={t('nav.settings')}
              icon='settings'
              href='/settings/general'
              class='navSettings no-ajaxy'
              hasSubmenu
              subMenuTarget='settings'
              active={activeItem === 'settings'}
            >
              <Submenu id='settings'>
                <SubmenuItem
                  text={t('settings.general')}
                  icon='tune'
                  href='/settings'
                  active={activeSubItem === 'settings-general'}
                />
                <SubmenuItem
                  text={t('nav.accounts')}
                  icon='tune'
                  href='/settings/accounts'
                  active={activeSubItem === 'settings-accounts'}
                />
                <SubmenuItem
                  text={t('settings.appearance')}
                  icon='style'
                  href='/settings/appearance'
                  active={activeSubItem === 'settings-appearance'}
                />
                <SubmenuItem
                  text={t('nav.tickets')}
                  icon='assignment'
                  href='/settings/tickets'
                  active={activeSubItem === 'settings-tickets'}
                />
                <SubmenuItem
                  text={t('settings.permissions')}
                  icon='security'
                  href='/settings/permissions'
                  active={activeSubItem === 'settings-permissions'}
                />
                <SubmenuItem
                  text={t('settings.mailer')}
                  icon='email'
                  href='/settings/mailer'
                  active={activeSubItem === 'settings-mailer'}
                />
                <SubmenuItem
                  href='/settings/elasticsearch'
                  text='Elasticsearch'
                  icon='search'
                  active={activeSubItem === 'settings-elasticsearch'}
                />
                <SubmenuItem
                  text={t('settings.backup')}
                  icon='archive'
                  href='/settings/backup'
                  active={activeSubItem === 'settings-backup'}
                />
                <SubmenuItem
                  text={t('settings.server', 'Server')}
                  icon='dns'
                  href='/settings/server'
                  active={activeSubItem === 'settings-server'}
                />
                <SubmenuItem
                  text={t('settings.legal')}
                  icon='gavel'
                  href='/settings/legal'
                  active={activeSubItem === 'settings-legal'}
                />
                {sessionUser && Helpers.canUser('settings:logs') && (
                  <SubmenuItem
                    text={t('settings.logs')}
                    icon='remove_from_queue'
                    href='/settings/logs'
                    hasSeperator
                    active={activeSubItem === 'settings-logs'}
                  />
                )}
              </Submenu>
            </SidebarItem>
          )}
          <NavSeparator />
          <SidebarItem href='/about' icon='help' text={t('common.about', 'About')} active={activeItem === 'about'} />
          {/* <SidebarItem href={'https://www.trudesk.io'} icon={'cloud'} text={'Cloud'} target={'_blank'} /> */}
        </ul>
      </div>
      <div className='side-nav-bottom-panel'>
        <LanguageSwitcher className='sidebar-lang-switcher' />
        <a id='expand-menu' className='no-ajaxy' href='#'>
          <i className='material-icons'>menu</i>{t('common.collapseMenu', 'Collapse Menu')}
        </a>
      </div>
    </div>
  )
}

Sidebar.propTypes = {
  updateNavChange: PropTypes.func.isRequired,
  activeItem: PropTypes.string.isRequired,
  activeSubItem: PropTypes.string.isRequired,
  sessionUser: PropTypes.object,
  plugins: PropTypes.array,
  notice: PropTypes.object,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  activeItem: state.sidebar.activeItem,
  activeSubItem: state.sidebar.activeSubItem,
  sessionUser: state.shared.sessionUser,
  notice: state.shared.notice
})

export default withTranslation()(connect(mapStateToProps, { updateNavChange })(Sidebar))
