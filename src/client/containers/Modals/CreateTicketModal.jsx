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
 *  Updated:    2/10/19 3:06 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { head, orderBy } from 'lodash'
import axios from 'axios'
import Log from '../../logger'
import { createTicket, fetchTicketTypes, getTagsWithPage } from 'actions/tickets'
import { fetchGroups } from 'actions/groups'
import { fetchAccountsCreateTicket } from 'actions/accounts'

import $ from 'jquery'
import helpers from 'lib/helpers'

import BaseModal from 'containers/Modals/BaseModal'
import Grid from 'components/Grid'
import GridItem from 'components/Grid/GridItem'
import SingleSelect from 'components/SingleSelect'
import SpinLoader from 'components/SpinLoader'
import Button from 'components/Button'
import EasyMDE from 'components/EasyMDE'

function CreateTicketModal (props) {
  const { shared, viewdata, t, socket, accounts, groups, ticketTypes, ticketTags } = props

  const [priorities, setPriorities] = useState([])
  const [selectedPriority, setSelectedPriority] = useState('')
  const issueTextRef = useRef('')

  const ownerSelectRef = useRef(null)
  const groupSelectRef = useRef(null)
  const typeSelectRef = useRef(null)
  const tagSelectRef = useRef(null)
  const issueMdeRef = useRef(null)
  const priorityLoaderRef = useRef(null)
  const priorityWrapperRef = useRef(null)

  useEffect(() => {
    props.fetchTicketTypes()
    props.getTagsWithPage({ limit: -1 })
    props.fetchGroups()
    props.fetchAccountsCreateTicket({ type: 'all', limit: 1000 })
    helpers.UI.inputs()
    helpers.formvalidator()
  }, [])

  useEffect(() => {
    const defaultTicketType = viewdata.get('defaultTicketType')
    if (defaultTicketType) {
      const prios = orderBy(viewdata.toJS().defaultTicketType.priorities, ['migrationNum'])
      setPriorities(prios)
      setSelectedPriority(head(prios) ? head(prios)._id : '')
    }
  }, [viewdata])

  const onTicketTypeSelectChange = useCallback((e) => {
    priorityWrapperRef.current.classList.add('hide')
    priorityLoaderRef.current.classList.remove('hide')
    axios
      .get(`/api/v1/tickets/type/${e.target.value}`)
      .then(res => {
        const type = res.data.type
        if (type && type.priorities) {
          const newPriorities = orderBy(type.priorities, ['migrationNum'])
          setPriorities(newPriorities)
          setSelectedPriority(head(orderBy(type.priorities, ['migrationNum']))
            ? head(orderBy(type.priorities, ['migrationNum']))._id
            : '')

          setTimeout(() => {
            priorityLoaderRef.current.classList.add('hide')
            priorityWrapperRef.current.classList.remove('hide')
          }, 500)
        }
      })
      .catch(error => {
        priorityLoaderRef.current.classList.add('hide')
        Log.error(error)
        helpers.UI.showSnackbar(`Error: ${error.response.data.error}`)
      })
  }, [])

  const onPriorityRadioChange = useCallback((e) => {
    setSelectedPriority(e.target.value)
  }, [])

  const onFormSubmit = useCallback((e) => {
    e.preventDefault()
    const $form = $(e.target)

    const data = {}
    if (issueTextRef.current.length < 1) return
    const allowAgentUserTickets =
      viewdata.get('ticketSettings').get('allowAgentUserTickets') &&
      (shared.sessionUser.role.isAdmin || shared.sessionUser.role.isAgent)

    const minIssueLength = viewdata.get('ticketSettings').get('minIssue')
    let $mdeError
    const $issueTextbox = $(issueMdeRef.current.element)
    const $errorBorderWrap = $issueTextbox.parents('.error-border-wrap')
    if (issueTextRef.current.length < minIssueLength) {
      $errorBorderWrap.css({ border: '1px solid #E74C3C' })
      const mdeError = $(
        `<div class="mde-error uk-float-left uk-text-left">${t('modals.createTicket.validIssue', { min: minIssueLength })}</div>`
      )
      $mdeError = $issueTextbox.siblings('.editor-statusbar').find('.mde-error')
      if ($mdeError.length < 1) $issueTextbox.siblings('.editor-statusbar').prepend(mdeError)

      return
    }

    $errorBorderWrap.css('border', 'none')
    $mdeError = $issueTextbox.parent().find('.mde-error')
    if ($mdeError.length > 0) $mdeError.remove()

    if (!$form.isValid(null, null, false)) return true

    if (allowAgentUserTickets) data.owner = ownerSelectRef.current.value

    data.subject = e.target.subject.value
    data.group = groupSelectRef.current.value
    data.type = typeSelectRef.current.value
    data.tags = tagSelectRef.current.value
    data.priority = selectedPriority
    data.issue = issueMdeRef.current.easymde.value()
    data.socketid = socket.io.engine.id

    props.createTicket(data)
  }, [viewdata, shared, selectedPriority, socket, t])

  const onGroupSelectChange = useCallback((e) => {
    // this.groupAccounts = this.props.groups
    //   .filter(grp => grp.get('_id') === e.target.value)
    //   .first()
    //   .get('members')
    //   .map(a => {
    //     return { text: a.get('fullname'), value: a.get('_id') }
    //   })
    //   .toArray()
  }, [])

  const allowAgentUserTickets =
    viewdata.get('ticketSettings').get('allowAgentUserTickets') &&
    (shared.sessionUser.role.isAdmin || shared.sessionUser.role.isAgent)

  const mappedAccounts = accounts
    .map(a => {
      return { text: a.get('fullname'), value: a.get('_id') }
    })
    .toArray()

  const mappedGroups = groups
    .map(grp => {
      return { text: grp.get('name'), value: grp.get('_id') }
    })
    .toArray()

  const mappedTicketTypes = ticketTypes.toArray().map(type => {
    return { text: type.get('name'), value: type.get('_id') }
  })
  const mappedTicketTags = ticketTags.toArray().map(tag => {
    return { text: tag.get('name'), value: tag.get('_id') }
  })
  return (
    <BaseModal {...props} options={{ bgclose: false }}>
      <form className='uk-form-stacked' onSubmit={e => onFormSubmit(e)}>
        <div className='uk-margin-medium-bottom'>
          <label>{t('modals.createTicket.subject')}</label>
          <input
            type='text'
            name='subject'
            className='md-input'
            data-validation='length'
            data-validation-length={`min${viewdata.get('ticketSettings').get('minSubject')}`}
            data-validation-error-msg={t('modals.createTicket.validSubject', { min: viewdata.get('ticketSettings').get('minSubject') })}
          />
        </div>
        <div className='uk-margin-medium-bottom'>
          <Grid>
            {allowAgentUserTickets && (
              <GridItem width='1-3'>
                <label className='uk-form-label'>{t('modals.createTicket.owner')}</label>
                <SingleSelect
                  showTextbox
                  items={mappedAccounts}
                  defaultValue={shared.sessionUser._id}
                  width='100%'
                  ref={i => (ownerSelectRef.current = i)}
                />
              </GridItem>
            )}
            <GridItem width={allowAgentUserTickets ? '2-3' : '1-1'}>
              <label className='uk-form-label'>{t('modals.createTicket.group')}</label>
              <SingleSelect
                showTextbox={false}
                items={mappedGroups}
                defaultValue={head(mappedGroups) ? head(mappedGroups).value : ''}
                onSelectChange={e => onGroupSelectChange(e)}
                width='100%'
                ref={i => (groupSelectRef.current = i)}
              />
            </GridItem>
          </Grid>
        </div>
        <div className='uk-margin-medium-bottom'>
          <Grid>
            <GridItem width='1-3'>
              <label className='uk-form-label'>{t('modals.createTicket.type')}</label>
              <SingleSelect
                showTextbox={false}
                items={mappedTicketTypes}
                width='100%'
                defaultValue={viewdata.get('defaultTicketType').get('_id')}
                onSelectChange={e => {
                  onTicketTypeSelectChange(e)
                }}
                ref={i => (typeSelectRef.current = i)}
              />
            </GridItem>
            <GridItem width='2-3'>
              <label className='uk-form-label'>{t('modals.createTicket.tags')}</label>
              <SingleSelect
                showTextbox={false}
                items={mappedTicketTags}
                width='100%'
                multiple
                ref={i => (tagSelectRef.current = i)}
              />
            </GridItem>
          </Grid>
        </div>
        <div className='uk-margin-medium-bottom'>
          <label className='uk-form-label'>{t('modals.createTicket.priority')}</label>
          <div
            ref={priorityLoaderRef}
            style={{ height: '32px', width: '32px', position: 'relative' }}
            className='hide'
          >
            <SpinLoader
              style={{ background: 'transparent' }}
              spinnerStyle={{ width: '24px', height: '24px' }}
              active
            />
          </div>
          <div ref={priorityWrapperRef} className='uk-clearfix'>
            {priorities.map(priority => {
              return (
                <div key={priority._id} className='uk-float-left'>
                  <span className='icheck-inline'>
                    <input
                      id={'p___' + priority._id}
                      name='priority'
                      type='radio'
                      className='with-gap'
                      value={priority._id}
                      onChange={e => {
                        onPriorityRadioChange(e)
                      }}
                      checked={selectedPriority === priority._id}
                      data-md-icheck
                    />
                    <label htmlFor={'p___' + priority._id} className='mb-10 inline-label'>
                      <span className='uk-badge' style={{ backgroundColor: priority.htmlColor }}>
                        {t('priorities.' + priority.name, priority.name)}
                      </span>
                    </label>
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <div className='uk-margin-medium-bottom'>
          <span>{t('modals.createTicket.description')}</span>
          <div className='error-border-wrap uk-clearfix'>
            <EasyMDE
              ref={i => (issueMdeRef.current = i)}
              onChange={val => (issueTextRef.current = val)}
              allowImageUpload
              inlineImageUploadUrl='/tickets/uploadmdeimage'
              inlineImageUploadHeaders={{ ticketid: 'uploads' }}
            />
          </div>
          <span style={{ marginTop: '6px', display: 'inline-block', fontSize: '11px' }} className='uk-text-muted'>
            {t('modals.createTicket.descriptionHint')}
          </span>
        </div>
        <div className='uk-modal-footer uk-text-right'>
          <Button text={t('common.cancel')} flat waves extraClass='uk-modal-close' />
          <Button text={t('common.create')} style='primary' flat type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

CreateTicketModal.propTypes = {
  shared: PropTypes.object.isRequired,
  socket: PropTypes.object.isRequired,
  viewdata: PropTypes.object.isRequired,
  ticketTypes: PropTypes.object.isRequired,
  priorities: PropTypes.object.isRequired,
  ticketTags: PropTypes.object.isRequired,
  accounts: PropTypes.object.isRequired,
  groups: PropTypes.object.isRequired,
  createTicket: PropTypes.func.isRequired,
  fetchTicketTypes: PropTypes.func.isRequired,
  getTagsWithPage: PropTypes.func.isRequired,
  fetchGroups: PropTypes.func.isRequired,
  fetchAccountsCreateTicket: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  shared: state.shared,
  socket: state.shared.socket,
  viewdata: state.common.viewdata,
  ticketTypes: state.ticketsState.types,
  priorities: state.ticketsState.priorities,
  ticketTags: state.tagsSettings.tags,
  groups: state.groupsState.groups,
  accounts: state.accountsState.accountsCreateTicket
})

export default withTranslation()(connect(mapStateToProps, {
  createTicket,
  fetchTicketTypes,
  getTagsWithPage,
  fetchGroups,
  fetchAccountsCreateTicket
})(CreateTicketModal))
