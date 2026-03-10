/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/9/19 9:44 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { each, without, uniq } from 'lodash'

import Log from '../../logger'
import axios from 'axios'
import {
  fetchTickets,
  deleteTicket,
  ticketEvent,
  unloadTickets,
  ticketUpdated,
  fetchTicketStatus
} from 'actions/tickets'
import { fetchSearchResults } from 'actions/search'
import { showModal } from 'actions/common'

import PageTitle from 'components/PageTitle'
import Table from 'components/Table'
import TableHeader from 'components/Table/TableHeader'
import TableRow from 'components/Table/TableRow'
import TitlePagination from 'components/TitlePagination'
import PageContent from 'components/PageContent'
import TableCell from 'components/Table/TableCell'
import PageTitleButton from 'components/PageTitleButton'
import DropdownTrigger from 'components/Dropdown/DropdownTrigger'
import Dropdown from 'components/Dropdown'
import DropdownItem from 'components/Dropdown/DropdownItem'
import DropdownSeparator from 'components/Dropdown/DropdownSeperator'

import helpers from 'lib/helpers'
import anime from 'animejs'
import moment from 'moment-timezone'
import SearchResults from 'components/SearchResults'

function TicketsContainer (props) {
  const {
    socket,
    view = 'active',
    page = 0,
    prevPage,
    nextPage,
    prevEnabled = true,
    nextEnabled = true,
    tickets,
    totalCount,
    loading,
    fetchTickets: propsFetchTickets,
    deleteTicket: propsDeleteTicket,
    ticketEvent: propsTicketEvent,
    unloadTickets: propsUnloadTickets,
    ticketUpdated: propsTicketUpdated,
    showModal: propsShowModal,
    fetchSearchResults: propsFetchSearchResults,
    common,
    filter,
    ticketStatuses,
    fetchTicketStatus: propsFetchTicketStatus,
    t
  } = props

  const [searchTerm, setSearchTerm] = useState('')
  const selectedTicketsRef = useRef([])
  const ticketsTableRef = useRef(null)
  const selectAllCheckboxRef = useRef(null)
  const searchContainerRef = useRef(null)
  const timelineRef = useRef(null)

  const onTicketCreated = useCallback(
    ticket => {
      if (page === '0') propsTicketEvent({ type: 'created', data: ticket })
    },
    [page, propsTicketEvent]
  )

  const onTicketUpdated = useCallback(
    data => {
      propsTicketUpdated(data)
    },
    [propsTicketUpdated]
  )

  const onTicketDeleted = useCallback(
    id => {
      propsTicketEvent({ type: 'deleted', data: id })
    },
    [propsTicketEvent]
  )

  useEffect(() => {
    if (!socket) return
    socket.on('$trudesk:client:ticket:created', onTicketCreated)
    socket.on('$trudesk:client:ticket:updated', onTicketUpdated)
    socket.on('$trudesk:client:ticket:deleted', onTicketDeleted)

    propsFetchTickets({ limit: 50, page, type: view, filter })
    propsFetchTicketStatus()

    return () => {
      anime.remove('tr.overdue td')
      timelineRef.current = null
      propsUnloadTickets()
      socket.off('$trudesk:client:ticket:created', onTicketCreated)
      socket.off('$trudesk:client:ticket:updated', onTicketUpdated)
      socket.off('$trudesk:client:ticket:deleted', onTicketDeleted)
    }
  }, [socket])

  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.pause()
      timelineRef.current.seek(0)
    }

    anime.remove('tr.overdue td')

    timelineRef.current = anime.timeline({
      direction: 'alternate',
      duration: 800,
      autoPlay: false,
      easing: 'steps(1)',
      loop: true,
      backgroundColor: 'blue'
    })

    timelineRef.current.add({
      targets: 'tr.overdue td',
      backgroundColor: '#b71c1c',
      color: '#ffffff'
    })

    timelineRef.current.play()
  })

  const _clearChecked = useCallback(() => {
    selectedTicketsRef.current = []
    const checkboxes = ticketsTableRef.current.querySelectorAll('td > input[type="checkbox"]')
    checkboxes.forEach(item => {
      item.checked = false
    })

    selectAllCheckboxRef.current.checked = false
  }, [])

  const _selectAll = useCallback(() => {
    selectedTicketsRef.current = []
    const checkboxes = ticketsTableRef.current.querySelectorAll('td > input[type="checkbox"]')
    checkboxes.forEach(item => {
      selectedTicketsRef.current.push(item.dataset.ticket)
      item.checked = true
    })

    selectedTicketsRef.current = uniq(selectedTicketsRef.current)
  }, [])

  const onTicketCheckChanged = useCallback((e, id) => {
    if (e.target.checked) selectedTicketsRef.current.push(id)
    else selectedTicketsRef.current = without(selectedTicketsRef.current, id)

    selectedTicketsRef.current = uniq(selectedTicketsRef.current)
  }, [])

  const onSetStatus = useCallback(
    status => {
      const batch = selectedTicketsRef.current.map(id => {
        return { id, status: status.get('_id') }
      })

      axios
        .put('/api/v2/tickets/batch', { batch })
        .then(res => {
          if (res.data.success) {
            helpers.UI.showSnackbar({ text: t('tickets.statusSetTo', { status: status.get('name') }) })
            _clearChecked()
          } else {
            helpers.UI.showSnackbar(t('errors.general'), true)
            Log.error(res.data.error)
          }
        })
        .catch(error => {
          Log.error(error)
          helpers.UI.showSnackbar(t('errors.general'), true)
        })
    },
    [t, _clearChecked]
  )

  const onDeleteClicked = useCallback(() => {
    each(selectedTicketsRef.current, id => {
      propsDeleteTicket({ id })
    })

    _clearChecked()
  }, [propsDeleteTicket, _clearChecked])

  const onSearchTermChanged = useCallback(
    e => {
      const value = e.target.value
      setSearchTerm(value)
      if (value.length > 3) {
        SearchResults.toggleAnimation(true, true)
        propsFetchSearchResults({ term: value })
      } else {
        SearchResults.toggleAnimation(true, false)
      }
    },
    [propsFetchSearchResults]
  )

  const _onSearchFocus = useCallback(() => {
    if (searchTerm.length > 3) SearchResults.toggleAnimation(true, true)
  }, [searchTerm])

  const onSelectAll = useCallback(
    e => {
      if (e.target.checked) _selectAll()
      else _clearChecked()
    },
    [_selectAll, _clearChecked]
  )

  const loadingItems = []
  for (let i = 0; i < 51; i++) {
    const cells = []
    for (let k = 0; k < 10; k++) {
      cells.push(
        <TableCell key={k} className='vam'>
          <div className='loadingTextAnimation' />
        </TableCell>
      )
    }

    loadingItems.push(<TableRow key={Math.random()}>{cells}</TableRow>)
  }

  const selectAllCheckbox = (
    <div style={{ marginLeft: 17 }}>
      <input
        type='checkbox'
        id='select_all'
        style={{ display: 'none' }}
        className='svgcheckinput'
        onChange={e => onSelectAll(e)}
        ref={selectAllCheckboxRef}
      />
      <label htmlFor='select_all' className='svgcheck'>
        <svg width='16px' height='16px' viewBox='0 0 18 18'>
          <path d='M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z' />
          <polyline points='1 9 7 14 15 4' />
        </svg>
      </label>
    </div>
  )

  return (
    <div>
      <PageTitle
        title={t('tickets.title')}
        shadow={false}
        rightComponent={
          <div>
            <div className='uk-float-right'>
              <TitlePagination
                limit={50}
                total={totalCount}
                type={view}
                prevEnabled={prevEnabled}
                nextEnabled={nextEnabled}
                currentPage={page}
                prevPage={prevPage}
                nextPage={nextPage}
                filter={filter}
              />
              <PageTitleButton
                fontAwesomeIcon='fa-refresh'
                onButtonClick={e => {
                  e.preventDefault()
                  propsUnloadTickets()
                    .then(propsFetchTickets({ type: view, page }))
                }}
              />
              <PageTitleButton
                fontAwesomeIcon='fa-filter'
                onButtonClick={e => {
                  e.preventDefault()
                  propsShowModal('FILTER_TICKET')
                }}
              />
              <DropdownTrigger pos='bottom-right' offset={5} extraClass='uk-float-left'>
                <PageTitleButton fontAwesomeIcon='fa-tasks' />
                <Dropdown small width={120}>
                  <DropdownItem text={t('common.create')} onClick={() => propsShowModal('CREATE_TICKET')} />
                  <DropdownSeparator />
                  {ticketStatuses.map(s => (
                    <DropdownItem
                      key={s.get('_id')}
                      text={t('tickets.set') + ' ' + s.get('name')}
                      onClick={() => onSetStatus(s)}
                    />
                  ))}
                  {helpers.canUser('tickets:delete', true) && <DropdownSeparator />}
                  {helpers.canUser('tickets:delete', true) && (
                    <DropdownItem text={t('common.delete')} extraClass='text-danger' onClick={() => onDeleteClicked()} />
                  )}
                </Dropdown>
              </DropdownTrigger>
              <div className='uk-float-right'>
                <div
                  id='ticket-search-box'
                  className='search-box uk-float-left nb'
                  style={{ marginTop: 8, paddingLeft: 0 }}
                >
                  <input
                    type='text'
                    id='tickets_Search'
                    placeholder={t('common.search')}
                    className='ticket-top-search'
                    value={searchTerm}
                    onChange={e => onSearchTermChanged(e)}
                    onFocus={e => _onSearchFocus(e)}
                  />
                </div>
              </div>
            </div>
            <SearchResults target='#ticket-search-box' ref={searchContainerRef} />
          </div>
        }
      />
      <PageContent padding={0} paddingBottom={0} extraClass='uk-position-relative'>
        {/* <SpinLoader active={loading} /> */}
        <Table
          tableRef={ref => (ticketsTableRef.current = ref)}
          style={{ margin: 0 }}
          extraClass='pDataTable'
          stickyHeader
          striped
          headers={[
            <TableHeader key={0} width={45} height={50} component={selectAllCheckbox} />,
            <TableHeader key={1} width={60} text={t('common.status')} />,
            <TableHeader key={2} width={65} text='#' />,
            <TableHeader key={3} width='23%' text={t('common.subject')} />,
            <TableHeader key={4} width={110} text={t('tickets.created')} />,
            <TableHeader key={5} width={125} text={t('tickets.requester')} />,
            <TableHeader key={6} width={175} text={t('tickets.customer')} />,
            <TableHeader key={7} text={t('common.assignee')} />,
            <TableHeader key={8} width={110} text={t('tickets.dueDate')} />,
            <TableHeader key={9} text={t('tickets.updated')} />
          ]}
        >
          {!loading && tickets.size < 1 && (
            <TableRow clickable={false}>
              <TableCell colSpan={10}>
                <h5 style={{ margin: 10 }}>{t('tickets.noTicketsFound')}</h5>
              </TableCell>
            </TableRow>
          )}
          {loading && loadingItems}
          {!loading &&
            tickets.map(ticket => {
              const status = ticketStatuses.find(s => s.get('_id') === ticket.get('status').get('_id'))

              const assignee = () => {
                const a = ticket.get('assignee')
                return !a ? '--' : a.get('fullname')
              }

              const updated = ticket.get('updated')
                ? helpers.formatDate(ticket.get('updated'), helpers.getShortDateFormat()) +
                  ', ' +
                  helpers.formatDate(ticket.get('updated'), helpers.getTimeFormat())
                : '--'

              const dueDate = ticket.get('dueDate')
                ? helpers.formatDate(ticket.get('dueDate'), helpers.getShortDateFormat())
                : '--'

              const isOverdue = () => {
                if (!common.viewdata.get('showOverdue') || [2, 3].indexOf(ticket.get('status')) !== -1) { return false }
                const overdueIn = ticket.getIn(['priority', 'overdueIn'])
                const now = moment()
                let updated = ticket.get('updated')
                if (updated) updated = moment(updated)
                else updated = moment(ticket.get('date'))

                const timeout = updated.clone().add(overdueIn, 'm')
                return now.isAfter(timeout)
              }

              return (
                <TableRow
                  key={ticket.get('_id')}
                  className={`ticket-${status == null ? 'unknonwn' : status.get('name')} ${
                    isOverdue() ? 'overdue' : ''
                  }`}
                  clickable
                  onClick={e => {
                    const td = e.target.closest('td')
                    const input = td.getElementsByTagName('input')
                    if (input.length > 0) return false
                    History.pushState(null, `Ticket-${ticket.get('uid')}`, `/tickets/${ticket.get('uid')}`)
                  }}
                >
                  <TableCell
                    className='ticket-priority nbb vam'
                    style={{ borderColor: ticket.getIn(['priority', 'htmlColor']), padding: '18px 15px' }}
                  >
                    <input
                      type='checkbox'
                      id={`c_${ticket.get('_id')}`}
                      data-ticket={ticket.get('_id')}
                      style={{ display: 'none' }}
                      onChange={e => onTicketCheckChanged(e, ticket.get('_id'))}
                      className='svgcheckinput'
                    />
                    <label htmlFor={`c_${ticket.get('_id')}`} className='svgcheck'>
                      <svg width='16px' height='16px' viewBox='0 0 18 18'>
                        <path d='M1,9 L1,3.5 C1,2 2,1 3.5,1 L14.5,1 C16,1 17,2 17,3.5 L17,14.5 C17,16 16,17 14.5,17 L3.5,17 C2,17 1,16 1,14.5 L1,9 Z' />
                        <polyline points='1 9 7 14 15 4' />
                      </svg>
                    </label>
                  </TableCell>
                  <TableCell className='ticket-status vam nbb uk-text-center'>
                    <span
                      className='uk-display-inline-block'
                      style={{ backgroundColor: status == null ? '#000' : status.get('htmlColor') }}
                    >
                      {status == null ? 'U' : status.get('name')[0].toUpperCase()}
                    </span>
                  </TableCell>
                  <TableCell className='vam nbb'>{ticket.get('uid')}</TableCell>
                  <TableCell className='vam nbb'>{ticket.get('subject')}</TableCell>
                  <TableCell className='vam nbb'>
                    {helpers.formatDate(ticket.get('date'), helpers.getShortDateFormat())}
                  </TableCell>
                  <TableCell className='vam nbb'>{ticket.getIn(['owner', 'fullname'])}</TableCell>
                  <TableCell className='vam nbb'>{ticket.getIn(['group', 'name'])}</TableCell>
                  <TableCell className='vam nbb'>{assignee()}</TableCell>
                  <TableCell className='vam nbb'>{dueDate}</TableCell>
                  <TableCell className='vam nbb'>{updated}</TableCell>
                </TableRow>
              )
            })}
        </Table>
      </PageContent>
    </div>
  )
}

TicketsContainer.propTypes = {
  socket: PropTypes.object.isRequired,
  view: PropTypes.string.isRequired,
  page: PropTypes.string.isRequired,
  prevPage: PropTypes.number.isRequired,
  nextPage: PropTypes.number.isRequired,
  prevEnabled: PropTypes.bool.isRequired,
  nextEnabled: PropTypes.bool.isRequired,
  tickets: PropTypes.object.isRequired,
  totalCount: PropTypes.string.isRequired,
  loading: PropTypes.bool.isRequired,
  fetchTickets: PropTypes.func.isRequired,
  deleteTicket: PropTypes.func.isRequired,
  ticketEvent: PropTypes.func.isRequired,
  unloadTickets: PropTypes.func.isRequired,
  ticketUpdated: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  fetchSearchResults: PropTypes.func.isRequired,
  common: PropTypes.object.isRequired,
  filter: PropTypes.object.isRequired,
  ticketStatuses: PropTypes.object.isRequired,
  fetchTicketStatus: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  tickets: state.ticketsState.tickets,
  totalCount: state.ticketsState.totalCount,
  prevPage: state.ticketsState.prevPage,
  nextPage: state.ticketsState.nextPage,
  loading: state.ticketsState.loading,
  common: state.common,
  socket: state.shared.socket,
  ticketStatuses: state.ticketsState.ticketStatuses,
  fetchTicketStatus: PropTypes.func.isRequired
})

export default withTranslation()(connect(mapStateToProps, {
  fetchTickets,
  deleteTicket,
  ticketEvent,
  unloadTickets,
  ticketUpdated,
  fetchSearchResults,
  showModal,
  fetchTicketStatus
})(TicketsContainer))
