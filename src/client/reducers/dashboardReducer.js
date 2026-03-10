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
 *  Updated:    7/1/22 12:16 AM
 *  Copyright (c) 2014-2022. Trudesk, Inc (Chris Brame) All rights reserved.
 */

import { fromJS, List } from 'immutable'
import { handleActions } from 'redux-actions'
import { sortBy, map } from 'lodash'
import {
  FETCH_DASHBOARD_DATA,
  FETCH_DASHBOARD_OVERDUE_TICKETS,
  FETCH_DASHBOARD_TOP_GROUPS,
  FETCH_DASHBOARD_TOP_TAGS
} from 'actions/types'

const initialState = {
  loading: false,
  lastUpdated: null,
  ticketBreakdownData: List([]),
  mostActiveTicket: null,
  mostAssignee: null,
  mostCommenter: null,
  mostRequester: null,
  ticketAvg: null,
  ticketCount: 0,
  closedCount: 0,

  loadingTopGroups: false,
  topGroups: List([]),

  loadingTopTags: false,
  topTags: List([]),

  loadingOverdueTickets: false,
  overdueTickets: List([])
}

const reducer = handleActions(
  {
    [FETCH_DASHBOARD_DATA.PENDING]: state => {
      return {
        ...state,
        loading: true
      }
    },

    [FETCH_DASHBOARD_DATA.SUCCESS]: (state, action) => {
      const r = action.response || {}
      return {
        ...state,
        loading: false,
        lastUpdated: r.lastUpdated || state.lastUpdated,
        ticketBreakdownData: r.data ? fromJS(r.data) : state.ticketBreakdownData,
        mostActiveTicket: r.mostActiveTicket ? fromJS(r.mostActiveTicket) : state.mostActiveTicket,
        mostCommenter: r.mostCommenter ? fromJS(r.mostCommenter) : state.mostCommenter,
        mostRequester: r.mostRequester ? fromJS(r.mostRequester) : state.mostRequester,
        mostAssignee: r.mostAssignee ? fromJS(r.mostAssignee) : state.mostAssignee,
        ticketAvg: r.ticketAvg != null ? fromJS(r.ticketAvg) : state.ticketAvg,
        ticketCount: r.ticketCount != null ? r.ticketCount : state.ticketCount,
        closedCount: r.closedCount != null ? r.closedCount : state.closedCount
      }
    },

    [FETCH_DASHBOARD_TOP_GROUPS.PENDING]: state => {
      return {
        ...state,
        loadingTopGroups: true
      }
    },

    [FETCH_DASHBOARD_TOP_GROUPS.SUCCESS]: (state, action) => {
      const items = action.response && action.response.items ? action.response.items : []
      let top5 = sortBy(items, i => i.count)
        .reverse()
        .slice(0, 5)

      top5 = map(top5, v => [v.name, v.count])

      return {
        ...state,
        loadingTopGroups: false,
        topGroups: fromJS(top5)
      }
    },

    [FETCH_DASHBOARD_TOP_TAGS.PENDING]: state => {
      return {
        ...state,
        loadingTopTags: true
      }
    },

    [FETCH_DASHBOARD_TOP_TAGS.SUCCESS]: (state, action) => {
      const items = action.response && action.response.tags ? action.response.tags : {}
      const topTags = map(items, (v, k) => [k, v])
      return {
        ...state,
        loadingTopTags: false,
        topTags: fromJS(topTags)
      }
    },

    [FETCH_DASHBOARD_OVERDUE_TICKETS.PENDING]: state => {
      return {
        ...state,
        loadingOverdueTickets: true
      }
    },

    [FETCH_DASHBOARD_OVERDUE_TICKETS.SUCCESS]: (state, action) => {
      if (!action.response || (action.response.success && action.response.error)) {
        return { ...state, loadingOverdueTickets: false, overdueTickets: initialState.overdueTickets }
      }

      return {
        ...state,
        loadingOverdueTickets: false,
        overdueTickets: fromJS(action.response.tickets || [])
      }
    }
  },
  initialState
)

export default reducer
