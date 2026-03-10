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

import React, { useEffect, useCallback, useRef } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import Log from '../../../logger'

import $ from 'jquery'
import axios from 'axios'
import UIKit from 'uikit'
import helpers from 'lib/helpers'

import { updateSetting } from 'actions/settings'
import { getTagsWithPage, tagsUpdateCurrentPage, deleteStatus } from 'actions/tickets'
import { showModal } from 'actions/common'

import EnableSwitch from 'components/Settings/EnableSwitch'
import NumberWithSave from 'components/Settings/NumberWithSave'
import Button from 'components/Button'
import ButtonGroup from 'components/ButtonGroup'
import TicketTypeBody from './ticketTypeBody'
import SettingSubItem from 'components/Settings/SettingSubItem'
import Zone from 'components/ZoneBox/zone'
import ZoneBox from 'components/ZoneBox'
import Grid from 'components/Grid'
import EditPriorityPartial from './editPriorityPartial'
import GridItem from 'components/Grid/GridItem'
import SettingItem from 'components/Settings/SettingItem'
import SingleSelect from 'components/SingleSelect'
import SplitSettingsPanel from 'components/Settings/SplitSettingsPanel'
import SpinLoader from 'components/SpinLoader'
import TicketStatusContainer from 'containers/Settings/Tickets/ticketStatusContainer'

function toggleEditPriority (e) {
  const $parent = $(e.target).parents('.priority-wrapper')
  const $v = $parent.find('.view-priority')
  const $e = $parent.find('.edit-priority')
  if ($v && $e) {
    $v.toggleClass('hide')
    $e.toggleClass('hide')
  }
}

function toggleEditTag (e) {
  const $target = $(e.target)
  const $parent = $target.parents('.tag-wrapper')
  const $v = $parent.find('.view-tag')
  const $e = $parent.find('.edit-tag')
  if ($v && $e) {
    $v.toggleClass('hide')
    $e.toggleClass('hide')
  }
}

const TicketsSettings = ({
  active,
  viewdata,
  settings,
  tagsSettings,
  updateSetting,
  getTagsWithPage,
  tagsUpdateCurrentPage,
  showModal,
  deleteStatus,
  t
}) => {
  const tagsPaginationRef = useRef(null)

  const getTicketTags = useCallback(
    (e, page) => {
      if (e) e.preventDefault()
      tagsUpdateCurrentPage(page)
      getTagsWithPage({ limit: 16, page })
    },
    [tagsUpdateCurrentPage, getTagsWithPage]
  )

  useEffect(() => {
    getTicketTags(null, 0)
    const $tagPagination = $('#tagPagination')
    tagsPaginationRef.current = UIKit.pagination($tagPagination, {
      items: tagsSettings.totalCount ? tagsSettings.totalCount : 0,
      itemsOnPage: 16
    })
    $tagPagination.on('select.uk.pagination', getTicketTags)
  }, [])

  useEffect(() => {
    if (tagsPaginationRef.current) {
      tagsPaginationRef.current.pages = Math.ceil(tagsSettings.totalCount / 16)
        ? Math.ceil(tagsSettings.totalCount / 16)
        : 1
      tagsPaginationRef.current.render()
      if (tagsPaginationRef.current.currentPage > tagsPaginationRef.current.pages - 1) { tagsPaginationRef.current.selectPage(tagsPaginationRef.current.pages - 1) }
    }
  }, [tagsSettings.totalCount])

  const getSetting = useCallback(
    name => {
      return settings.getIn(['settings', name, 'value']) ? settings.getIn(['settings', name, 'value']) : ''
    },
    [settings]
  )

  const getTicketTypes = useCallback(() => {
    return settings && settings.get('ticketTypes') ? settings.get('ticketTypes').toArray() : []
  }, [settings])

  const getPriorities = useCallback(() => {
    return settings && settings.get('priorities') ? settings.get('priorities').toArray() : []
  }, [settings])

  const getStatus = useCallback(() => {
    return settings && settings.get('status') ? settings.get('status').toArray() : []
  }, [settings])

  const onDefaultTicketTypeChange = useCallback(
    e => {
      updateSetting({ name: 'ticket:type:default', value: e.target.value, stateName: 'defaultTicketType' })
    },
    [updateSetting]
  )

  const onAllowPublicTicketsChange = useCallback(
    e => {
      updateSetting({
        name: 'allowPublicTickets:enable',
        value: e.target.checked,
        stateName: 'allowPublicTickets',
        noSnackbar: true
      })
    },
    [updateSetting]
  )

  const onAllowAgentUserTicketsChange = useCallback(
    e => {
      updateSetting({
        name: 'allowAgentUserTickets:enable',
        value: e.target.checked,
        stateName: 'allowAgentUserTickets',
        noSnackbar: true
      })
    },
    [updateSetting]
  )

  const onShowOverdueChange = useCallback(
    e => {
      updateSetting({
        name: 'showOverdueTickets:enable',
        value: e.target.checked,
        stateName: 'showOverdueTickets',
        noSnackbar: true
      })
    },
    [updateSetting]
  )

  const doShowModal = useCallback(
    (e, modal, props) => {
      e.preventDefault()
      showModal(modal, props)
    },
    [showModal]
  )

  const onRemovePriorityClicked = useCallback(
    (e, priority) => {
      e.preventDefault()
      showModal('DELETE_PRIORITY', { priority })
    },
    [showModal]
  )

  const onSubmitUpdateTag = useCallback(
    (e, tagId) => {
      e.preventDefault()
      e.persist()
      const name = e.target.name.value
      if (name.length < 2) return helpers.UI.showSnackbar('Invalid Tag Name', true)

      axios
        .put(`/api/v1/tags/${tagId}`, { name })
        .then(res => {
          toggleEditTag(e)
          helpers.UI.showSnackbar(`Tag: ${res.data.tag.name} updated successfully`)
          getTicketTags(null, tagsPaginationRef.current.currentPage)
        })
        .catch(err => {
          if (!err.response) return Log.error(err)

          const errorText = err.response.data.error
          Log.error(errorText, err.response)
          helpers.UI.showSnackbar(`Error: ${errorText}`, true)
        })
    },
    [getTicketTags]
  )

  const onRemoveTagClicked = useCallback(
    (e, tag) => {
      UIKit.modal.confirm(
        `Really delete tag <strong>${tag.get()}</strong><br />
        <i style="font-size: 13px; color: #e53935">This will remove the tag from all associated tickets.</i>`,
        () => {
          axios
            .delete(`/api/v1/tags/${tag.get('_id')}`)
            .then(res => {
              if (res.data.success) {
                helpers.UI.showSnackbar(`Successfully removed tag: ${tag.get('name')}`)

                getTicketTags(null, tagsPaginationRef.current.currentPage)
              }
            })
            .catch(error => {
              const errorText = error.response.data.error
              helpers.UI.showSnackbar(`Error: ${errorText}`, true)
              Log.error(errorText, error.response)
            })
        },
        {
          labels: { Ok: 'Yes', Cancel: 'No' },
          confirmButtonClass: 'md-btn-danger'
        }
      )
    },
    [getTicketTags]
  )

  const mappedTypes = getTicketTypes().map(function (type) {
    return { text: type.get('name'), value: type.get('_id') }
  })

  return (
    <div className={active ? 'active' : 'hide'}>
      <SettingItem
        title={t('settings.defaultTicketType')}
        subtitle={t('settings.defaultTicketTypeHint')}
        component={
          <SingleSelect
            items={mappedTypes}
            defaultValue={getSetting('defaultTicketType')}
            onSelectChange={e => {
              onDefaultTicketTypeChange(e)
            }}
            width='50%'
            showTextbox={false}
          />
        }
      />
      <SettingItem
        title={t('settings.allowPublicTickets')}
        subtitle={
          <div>
            {t('settings.allowPublicTicketsHint')} (
            <a href={viewdata.get('hosturl') + '/newissue'}>{viewdata.get('hosturl') + '/newissue'}</a>)
          </div>
        }
        component={
          <EnableSwitch
            stateName='allowPublicTickets'
            label={t('settings.enable')}
            checked={getSetting('allowPublicTickets')}
            onChange={e => {
              onAllowPublicTicketsChange(e)
            }}
          />
        }
      />
      <SettingItem
        title={t('settings.allowAgentUserTickets')}
        subtitle={<div>{t('settings.allowAgentUserTicketsHint')}</div>}
        tooltip={t('settings.allowAgentUserTicketsTooltip')}
        component={
          <EnableSwitch
            stateName='allowAgentUserTickets'
            label={t('settings.enable')}
            checked={getSetting('allowAgentUserTickets')}
            onChange={e => {
              onAllowAgentUserTicketsChange(e)
            }}
          />
        }
      />
      <SettingItem
        title={t('settings.showOverdueTickets')}
        subtitle={t('settings.showOverdueTicketsHint')}
        tooltip={t('settings.showOverdueTicketsTooltip')}
        component={
          <EnableSwitch
            stateName='showOverdueTickets'
            label={t('settings.enable')}
            checked={getSetting('showOverdueTickets')}
            onChange={e => {
              onShowOverdueChange(e)
            }}
          />
        }
      />
      {/* TODO: MOVE TO USER PREFS WHEN IMPL */}
      {/* <SettingItem */}
      {/*  title={'Play New Ticket Sound'} */}
      {/*  subtitle={'Enable/Disable playing an audio notification when a new ticket is submitted.'} */}
      {/*  tooltip={'[GLOBAL] This setting applies to all users.'} */}
      {/*  component={ */}
      {/*    <EnableSwitch */}
      {/*      stateName={'playNewTicketSound'} */}
      {/*      label={'Enable'} */}
      {/*      checked={getSetting('playNewTicketSound')} */}
      {/*      onChange={e => { */}
      {/*        onPlayNewTicketSoundChange(e) */}
      {/*      }} */}
      {/*    /> */}
      {/*  } */}
      {/* /> */}
      <SettingItem
        title={t('settings.minSubjectLength')}
        subtitle={t('settings.minSubjectLengthHint')}
        component={
          <NumberWithSave
            stateName='minSubjectLength'
            settingName='ticket:minlength:subject'
            value={getSetting('minSubjectLength')}
            width='40%'
          />
        }
      />
      <SettingItem
        title={t('settings.minIssueLength')}
        subtitle={t('settings.minIssueLengthHint')}
        component={
          <NumberWithSave
            stateName='minIssueLength'
            settingName='ticket:minlength:issue'
            value={getSetting('minIssueLength')}
            width='40%'
          />
        }
      />
      <SplitSettingsPanel
        title={t('settings.ticketTypes')}
        subtitle={t('common.create') + '/' + t('common.edit') + ' ' + t('settings.ticketTypes')}
        rightComponent={
          <Button
            text={t('common.create')}
            style='success'
            flat
            extraClass='md-btn-wave'
            onClick={e => {
              doShowModal(e, 'CREATE_TICKET_TYPE')
            }}
          />
        }
        menuItems={getTicketTypes().map(function (type) {
          return { key: type.get('_id'), title: type.get('name'), bodyComponent: <TicketTypeBody type={type} /> }
        })}
      />
      <SettingItem
        title={t('settings.ticketPriorities')}
        subtitle={t('settings.ticketPrioritiesHint')}
        component={
          <Button
            text={t('common.create')}
            style='success'
            flat
            waves
            extraClass='mt-10 right'
            onClick={e => doShowModal(e, 'CREATE_PRIORITY')}
          />
        }
      >
        <Zone>
          {getPriorities().map(p => {
            const disableRemove = p.get('default') ? p.get('default') : false
            return (
              <ZoneBox key={p.get('_id')} extraClass='priority-wrapper'>
                <SettingSubItem
                  parentClass='view-priority'
                  title={p.get('name')}
                  titleCss={{ color: p.get('htmlColor') }}
                  subtitle={
                    <div>
                      {t('settings.slaOverdue')}: <strong>{p.get('durationFormatted')}</strong>
                    </div>
                  }
                  component={
                    <ButtonGroup classNames='uk-float-right'>
                      <Button text={t('common.edit')} small onClick={e => toggleEditPriority(e)} />
                      <Button
                        text={t('settings.remove')}
                        small
                        style='danger'
                        disabled={disableRemove}
                        onClick={e => onRemovePriorityClicked(e, p)}
                      />
                    </ButtonGroup>
                  }
                />
                <EditPriorityPartial priority={p} />
              </ZoneBox>
            )
          })}
        </Zone>
      </SettingItem>
      <TicketStatusContainer statuses={getStatus()} />

      {/* <SettingItem */}
      {/*  title={'Ticket Status'} */}
      {/*  subtitle={'Ticket status sets the current status options available'} */}
      {/*  component={ */}
      {/*    <Button */}
      {/*      text={'Create'} */}
      {/*      style={'success'} */}
      {/*      flat={true} */}
      {/*      waves={true} */}
      {/*      extraClass={'mt-10 right'} */}
      {/*      onClick={e => doShowModal(e, 'CREATE_STATUS')} */}
      {/*    /> */}
      {/*  } */}
      {/* > */}
      {/*  <Zone> */}
      {/*    {getStatus().map(p => { */}
      {/*      return ( */}
      {/*        <ZoneBox key={p.get('_id')} extraClass={'status-wrapper'}> */}
      {/*          <SettingSubItem */}
      {/*            parentClass={'view-status'} */}
      {/*            title={p.get('name')} */}
      {/*            titleCss={{ color: p.get('htmlColor') }} */}
      {/*            component={ */}
      {/*              <ButtonGroup classNames={'uk-float-right'}> */}
      {/*                <Button */}
      {/*                  text={'Remove'} */}
      {/*                  small={true} */}
      {/*                  style={'danger'} */}
      {/*                  disabled={p.get('isLocked')} */}
      {/*                  onClick={e => onRemoveStatusClicked(e, p)} */}
      {/*                /> */}

      {/*                <Button text={'Edit'} small={true} onClick={e => toggleEditStatus(e)} /> */}
      {/*              </ButtonGroup> */}
      {/*            } */}
      {/*          /> */}
      {/*          <EditStatusPartial status={p} /> */}
      {/*        </ZoneBox> */}
      {/*      ) */}
      {/*    })} */}
      {/*  </Zone> */}
      {/* </SettingItem> */}

      <SettingItem
        title={t('settings.ticketTags')}
        subtitle={t('common.create') + '/' + t('common.edit') + ' ' + t('settings.ticketTags')}
        component={
          <Button
            text={t('common.create')}
            style='success'
            flat
            waves
            extraClass='mt-10 right'
            onClick={e =>
              doShowModal(e, 'CREATE_TAG', { page: 'settings', currentPage: tagsSettings.currentPage })}
          />
        }
        footer={<ul id='tagPagination' className='uk-pagination' />}
      >
        <Grid extraClass='uk-margin-medium-bottom'>
          {tagsSettings.tags.size < 1 && (
            <div style={{ width: '100%', padding: '55px', textAlign: 'center' }}>
              <h3 style={{ fontSize: '24px', fontWeight: '300' }}>{t('settings.noTagsFound')}</h3>
            </div>
          )}
          <SpinLoader active={tagsSettings.loading} extraClass='panel-bg' />
          <GridItem width='1-1'>
            <Grid extraClass='zone ml-0'>
              {tagsSettings.tags.map(i => {
                return (
                  <GridItem width='1-2' key={i.get('_id')} extraClass='tag-wrapper br bb'>
                    <Grid extraClass='view-tag'>
                      <GridItem width='1-1'>
                        <ZoneBox>
                          <Grid>
                            <GridItem width='1-2'>
                              <h5
                                style={{
                                  fontSize: '16px',
                                  lineHeight: '31px',
                                  margin: 0,
                                  padding: 0,
                                  fontWeight: 300
                                }}
                              >
                                {i.get('name')}
                              </h5>
                            </GridItem>
                            <GridItem width='1-2' extraClass='uk-text-right'>
                              <ButtonGroup classNames='mt-5'>
                                <Button
                                  text={t('common.edit')}
                                  flat
                                  waves
                                  small
                                  onClick={e => toggleEditTag(e)}
                                />
                                <Button
                                  text={t('settings.remove')}
                                  flat
                                  waves
                                  style='danger'
                                  small
                                  onClick={e => onRemoveTagClicked(e, i)}
                                />
                              </ButtonGroup>
                            </GridItem>
                          </Grid>
                        </ZoneBox>
                      </GridItem>
                    </Grid>
                    <Grid extraClass='edit-tag z-box uk-clearfix nbt hide' style={{ paddingTop: '5px' }}>
                      <GridItem width='1-1'>
                        <form onSubmit={e => onSubmitUpdateTag(e, i.get('_id'))}>
                          <Grid>
                            <GridItem width='2-3'>
                              <input type='text' className='md-input' name='name' defaultValue={i.get('name')} />
                            </GridItem>
                            <GridItem width='1-3' style={{ paddingTop: '10px' }}>
                              <ButtonGroup classNames='uk-float-right uk-text-right'>
                                <Button
                                  text={t('common.cancel')}
                                  flat
                                  waves
                                  small
                                  onClick={e => toggleEditTag(e)}
                                />
                                <Button
                                  type='submit'
                                  text={t('common.save')}
                                  flat
                                  waves
                                  small
                                  style='success'
                                />
                              </ButtonGroup>
                            </GridItem>
                          </Grid>
                        </form>
                      </GridItem>
                    </Grid>
                  </GridItem>
                )
              })}
            </Grid>
          </GridItem>
        </Grid>
      </SettingItem>
    </div>
  )
}

TicketsSettings.propTypes = {
  active: PropTypes.bool.isRequired,
  viewdata: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired,
  tagsSettings: PropTypes.object.isRequired,
  updateSetting: PropTypes.func.isRequired,
  getTagsWithPage: PropTypes.func.isRequired,
  tagsUpdateCurrentPage: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  deleteStatus: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  viewdata: state.common.viewdata,
  settings: state.settings.settings,
  tagsSettings: state.tagsSettings
})

export default withTranslation()(connect(mapStateToProps, {
  updateSetting,
  getTagsWithPage,
  tagsUpdateCurrentPage,
  showModal,
  deleteStatus
})(TicketsSettings))
