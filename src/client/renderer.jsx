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

import { Provider } from 'react-redux'
import { createRoot } from 'react-dom/client'
import React from 'react'

import DashboardContainer from 'containers/Dashboard'
import TicketsContainer from 'containers/Tickets/TicketsContainer'
import SingleTicketContainer from 'containers/Tickets/SingleTicketContainer'
import SettingsContainer from 'containers/Settings/SettingsContainer'
import AccountsContainer from 'containers/Accounts'
import AccountsImportContainer from 'containers/Accounts/AccountsImport'
import GroupsContainer from 'containers/Groups'
import TeamsContainer from 'containers/Teams'
import DepartmentsContainer from 'containers/Departments'
import NoticeContainer from 'containers/Notice/NoticeContainer'
import ProfileContainer from 'containers/Profile'
import MessagesContainer from 'containers/Messages'
import ReportsContainer from 'containers/Reports'
import AboutContainer from 'containers/About'

// Track React 18 roots for cleanup in ajaxify
window.react.roots = window.react.roots || {}

function mountRoot (id, element) {
  const el = document.getElementById(id)
  if (!el) return
  const root = createRoot(el)
  root.render(element)
  window.react.roots[id] = root
}

export default function (store) {
  if (document.getElementById('dashboard-container')) {
    const DashboardContainerWithProvider = (
      <Provider store={store}>
        <DashboardContainer />
      </Provider>
    )

    mountRoot('dashboard-container', DashboardContainerWithProvider)
  }

  if (document.getElementById('tickets-container')) {
    const view = document.getElementById('tickets-container').getAttribute('data-view')
    const page = document.getElementById('tickets-container').getAttribute('data-page')
    let filter = document.getElementById('tickets-container').getAttribute('data-filter')
    filter = filter ? JSON.parse(filter) : {}

    const TicketsContainerWithProvider = (
      <Provider store={store}>
        <TicketsContainer view={view} page={page} filter={filter} />
      </Provider>
    )

    mountRoot('tickets-container', TicketsContainerWithProvider)
  }

  if (document.getElementById('single-ticket-container')) {
    const ticketId = document.getElementById('single-ticket-container').getAttribute('data-ticket-id')
    const ticketUid = document.getElementById('single-ticket-container').getAttribute('data-ticket-uid')
    const SingleTicketContainerWithProvider = (
      <Provider store={store}>
        <SingleTicketContainer ticketId={ticketId} ticketUid={ticketUid} />
      </Provider>
    )

    mountRoot('single-ticket-container', SingleTicketContainerWithProvider)
  }

  if (document.getElementById('profile-container')) {
    mountRoot('profile-container',
      <Provider store={store}>
        <ProfileContainer />
      </Provider>
    )
  }

  if (document.getElementById('accounts-container')) {
    const title = document.getElementById('accounts-container').getAttribute('data-title')
    const view = document.getElementById('accounts-container').getAttribute('data-view')
    mountRoot('accounts-container',
      <Provider store={store}>
        <AccountsContainer title={title} view={view} />
      </Provider>
    )
  }

  if (document.getElementById('accounts-import-container')) {
    mountRoot('accounts-import-container',
      <Provider store={store}>
        <AccountsImportContainer />
      </Provider>
    )
  }

  if (document.getElementById('groups-container')) {
    mountRoot('groups-container',
      <Provider store={store}>
        <GroupsContainer />
      </Provider>
    )
  }

  if (document.getElementById('teams-container')) {
    mountRoot('teams-container',
      <Provider store={store}>
        <TeamsContainer />
      </Provider>
    )
  }

  if (document.getElementById('departments-container')) {
    mountRoot('departments-container',
      <Provider store={store}>
        <DepartmentsContainer />
      </Provider>
    )
  }

  if (document.getElementById('messages-container')) {
    const conversation = document.getElementById('messages-container').getAttribute('data-conversation-id')
    const showNewConversation = document.getElementById('messages-container').getAttribute('data-show-new-convo')
    mountRoot('messages-container',
      <Provider store={store}>
        <MessagesContainer initialConversation={conversation} showNewConvo={showNewConversation} />
      </Provider>
    )
  }

  if (document.getElementById('notices-container')) {
    mountRoot('notices-container',
      <Provider store={store}>
        <NoticeContainer />
      </Provider>
    )
  }

  if (document.getElementById('reports-container')) {
    mountRoot('reports-container',
      <Provider store={store}>
        <ReportsContainer />
      </Provider>
    )
  }

  if (document.getElementById('settings-container')) {
    mountRoot('settings-container',
      <Provider store={store}>
        <SettingsContainer />
      </Provider>
    )
  }

  if (document.getElementById('about-container')) {
    mountRoot('about-container',
      <Provider store={store}>
        <AboutContainer />
      </Provider>
    )
  }
}
