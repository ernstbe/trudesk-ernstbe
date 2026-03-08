/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    5/18/19 1:19 AM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { each } from 'lodash'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { hideModal } from 'actions/common'
import { fetchGroups, unloadGroups } from 'actions/groups'
import { fetchAccounts, unloadAccounts } from 'actions/accounts'
import { getTagsWithPage, fetchTicketTypes, fetchTicketStatus } from 'actions/tickets'

import BaseModal from 'containers/Modals/BaseModal'
import SingleSelect from 'components/SingleSelect'
import Button from 'components/Button'

import helpers from 'lib/helpers'

const FilterTicketsModal = ({
  viewdata,
  groupsState,
  accountsState,
  ticketTags,
  ticketTypes,
  ticketStatuses,
  hideModal,
  fetchGroups,
  unloadGroups,
  fetchAccounts,
  unloadAccounts,
  getTagsWithPage,
  fetchTicketTypes,
  fetchTicketStatus,
  t
}) => {
  const statusSelectRef = useRef(null)
  const tagsSelectRef = useRef(null)
  const typesSelectRef = useRef(null)
  const groupSelectRef = useRef(null)
  const assigneeSelectRef = useRef(null)

  useEffect(() => {
    helpers.UI.inputs()
    fetchGroups()
    fetchAccounts({ page: 0, limit: -1, type: 'agents', showDeleted: false })
    getTagsWithPage({ limit: -1 })
    fetchTicketTypes()
    fetchTicketStatus()

    return () => {
      unloadGroups()
      unloadAccounts()
    }
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()
  })

  const onSubmit = useCallback((e) => {
    e.preventDefault()
    const startDate = e.target.filterDate_Start.value
    const endDate = e.target.filterDate_End.value
    const subject = e.target.subject.value
    const statuses = statusSelectRef.current ? statusSelectRef.current.value : []
    const tags = tagsSelectRef.current ? tagsSelectRef.current.value : []
    const types = typesSelectRef.current ? typesSelectRef.current.value : []
    const groups = groupSelectRef.current ? groupSelectRef.current.value : []
    const assignees = assigneeSelectRef.current ? assigneeSelectRef.current.value : []

    let queryString = '?f=1'
    if (startDate) queryString += `&ds=${startDate}`
    if (endDate) queryString += `&de=${endDate}`

    if (subject) queryString += `&fs=${subject}`

    each(statuses, i => {
      queryString += `&st=${i}`
    })

    each(types, i => {
      queryString += `&tt=${i}`
    })

    each(tags, i => {
      queryString += `&tag=${i}`
    })

    each(groups, i => {
      queryString += `&gp=${i}`
    })

    each(assignees, i => {
      queryString += `&au=${i}`
    })

    History.pushState(null, null, `/tickets/filter/${queryString}&r=${Math.floor(Math.random() * (99999 - 1 + 1)) + 1}`)
    hideModal()
  }, [hideModal])

  const statusItems = ticketStatuses.map(s => ({ text: s.get('name'), value: s.get('_id') })).toArray()

  const tagItems = ticketTags
    .map(t => {
      return { text: t.get('name'), value: t.get('_id') }
    })
    .toArray()

  const typeItems = ticketTypes
    .map(t => {
      return { text: t.get('name'), value: t.get('_id') }
    })
    .toArray()

  const groupItems = groupsState.groups
    .map(g => {
      return { text: g.get('name'), value: g.get('_id') }
    })
    .toArray()

  const assigneeItems = accountsState.accounts
    .map(a => {
      return { text: a.get('fullname'), value: a.get('_id') }
    })
    .toArray()

  return (
    <BaseModal options={{ bgclose: false }}>
      <h2 style={{ marginBottom: 20 }}>{t('modals.filterTickets.title')}</h2>
      <form className='uk-form-stacked' onSubmit={e => onSubmit(e)}>
        <div className='uk-margin-medium-bottom'>
          <label>{t('common.subject')}</label>
          <input type='text' name='subject' className='md-input' />
        </div>
        <div className='uk-grid uk-grid-collapse uk-margin-small-bottom'>
          <div className='uk-width-1-2' style={{ padding: '0 15px 0 0' }}>
            <label htmlFor='filterDate_Start' className='uk-form-label nopadding nomargin'>
              {t('modals.filterTickets.startDate')}
            </label>
            <input
              id='filterDate_Start'
              className='md-input'
              name='filterDate_Start'
              type='text'
              data-uk-datepicker={"{format:'" + helpers.getShortDateFormat() + "'}"}
            />
          </div>
          <div className='uk-width-1-2' style={{ padding: '0 0 0 15px' }}>
            <label htmlFor='filterDate_End' className='uk-form-label nopadding nomargin'>
              {t('modals.filterTickets.endDate')}
            </label>
            <input
              id='filterDate_End'
              className='md-input'
              name='filterDate_End'
              type='text'
              data-uk-datepicker={"{format:'" + helpers.getShortDateFormat() + "'}"}
            />
          </div>
        </div>
        <div className='uk-grid uk-grid-collapse uk-margin-small-bottom'>
          <div className='uk-width-1-1'>
            <label htmlFor='filterStatus' className='uk-form-label' style={{ paddingBottom: 0, marginBottom: 0 }}>
              {t('common.status')}
            </label>
            <SingleSelect items={statusItems} showTextbox={false} multiple ref={statusSelectRef} />
          </div>
        </div>
        <div className='uk-grid uk-grid-collapse uk-margin-small-bottom'>
          <div className='uk-width-1-1'>
            <label htmlFor='filterStatus' className='uk-form-label' style={{ paddingBottom: 0, marginBottom: 0 }}>
              {t('settings.ticketTags')}
            </label>
            <SingleSelect items={tagItems} showTextbox multiple ref={tagsSelectRef} />
          </div>
        </div>
        <div className='uk-grid uk-grid-collapse uk-margin-small-bottom'>
          <div className='uk-width-1-1'>
            <label htmlFor='filterStatus' className='uk-form-label' style={{ paddingBottom: 0, marginBottom: 0 }}>
              {t('common.type')}
            </label>
            <SingleSelect items={typeItems} showTextbox={false} multiple ref={typesSelectRef} />
          </div>
        </div>
        <div className='uk-grid uk-grid-collapse uk-margin-small-bottom'>
          <div className='uk-width-1-1'>
            <label htmlFor='filterStatus' className='uk-form-label' style={{ paddingBottom: 0, marginBottom: 0 }}>
              {t('common.assignee')}
            </label>
            <SingleSelect
              items={assigneeItems}
              showTextbox={false}
              multiple
              ref={assigneeSelectRef}
            />
          </div>
        </div>
        <div className='uk-grid uk-grid-collapse uk-margin-small-bottom'>
          <div className='uk-width-1-1'>
            <label htmlFor='filterStatus' className='uk-form-label' style={{ paddingBottom: 0, marginBottom: 0 }}>
              {t('common.group')}
            </label>
            <SingleSelect items={groupItems} showTextbox={false} multiple ref={groupSelectRef} />
          </div>
        </div>
        <div className='uk-modal-footer uk-text-right'>
          <Button text={t('common.cancel')} flat waves extraClass='uk-modal-close' />
          <Button text={t('modals.filterTickets.applyFilter')} style='primary' flat={false} type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

FilterTicketsModal.propTypes = {
  viewdata: PropTypes.object.isRequired,
  groupsState: PropTypes.object.isRequired,
  accountsState: PropTypes.object.isRequired,
  hideModal: PropTypes.func.isRequired,
  fetchGroups: PropTypes.func.isRequired,
  unloadGroups: PropTypes.func.isRequired,
  fetchAccounts: PropTypes.func.isRequired,
  unloadAccounts: PropTypes.func.isRequired,
  getTagsWithPage: PropTypes.func.isRequired,
  ticketTags: PropTypes.object.isRequired,
  fetchTicketTypes: PropTypes.func.isRequired,
  ticketTypes: PropTypes.object.isRequired,
  fetchTicketStatus: PropTypes.func.isRequired,
  ticketStatuses: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  viewdata: state.common.viewdata,
  groupsState: state.groupsState,
  accountsState: state.accountsState,
  ticketTags: state.tagsSettings.tags,
  ticketTypes: state.ticketsState.types,
  ticketStatuses: state.ticketsState.ticketStatuses
})

export default withTranslation()(connect(mapStateToProps, {
  hideModal,
  fetchGroups,
  unloadGroups,
  fetchAccounts,
  unloadAccounts,
  getTagsWithPage,
  fetchTicketTypes,
  fetchTicketStatus
})(FilterTicketsModal))
