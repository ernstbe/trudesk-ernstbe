/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/23/19 6:12 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import { getTagsWithPage } from 'actions/tickets'
import { showModal, hideModal } from 'actions/common'

import BaseModal from 'containers/Modals/BaseModal'
import Button from 'components/Button'
import Log from '../../logger'
import axios from 'axios'
import $ from 'jquery'
import helpers from 'lib/helpers'

import { TICKETS_UI_TAGS_UPDATE } from 'serverSocket/socketEventConsts'

const AddTagsModal = ({ ticketId, currentTags, tagsSettings, getTagsWithPage, socket, showModal, hideModal, t }) => {
  const selectRef = useRef(null)
  const closeButtonRef = useRef(null)

  useEffect(() => {
    getTagsWithPage({ limit: -1, page: 0 })
  }, [])

  useEffect(() => {
    helpers.setupChosen()
    if (!$(selectRef.current).val() && currentTags && currentTags.length > 0) { $(selectRef.current).val(currentTags) }

    $(selectRef.current).trigger('chosen:updated')
  })

  const onCreateTagClicked = useCallback((e) => {
    e.preventDefault()
    hideModal()
    setTimeout(() => {
      showModal('CREATE_TAG')
    }, 300)
  }, [hideModal, showModal])

  const onSubmit = useCallback((e) => {
    e.preventDefault()
    let selectedTags = $(e.target.tags).val()
    if (!selectedTags) selectedTags = []
    axios
      .put(`/api/v1/tickets/${ticketId}`, {
        tags: selectedTags
      })
      .then(() => {
        socket.emit(TICKETS_UI_TAGS_UPDATE, { ticketId })
        closeButtonRef.current.click()
      })
      .catch(error => {
        Log.error(error)
        helpers.UI.showSnackbar(error, true)
      })
  }, [ticketId, socket])

  const onClearClicked = useCallback(() => {
    axios
      .put(`/api/v1/tickets/${ticketId}`, {
        tags: []
      })
      .then(() => {
        $(selectRef.current)
          .val('')
          .trigger('chosen:updated')
        socket.emit(TICKETS_UI_TAGS_UPDATE, { ticketId })
      })
      .catch(error => {
        Log.error(error)
        helpers.UI.showSnackbar(error, true)
      })
  }, [ticketId, socket])

  const mappedTags =
    tagsSettings.tags &&
    tagsSettings.tags
      .map(tag => {
        return {
          text: tag.get('name'),
          value: tag.get('_id')
        }
      })
      .toArray()

  return (
    <BaseModal options={{ bgclose: false }}>
      <div className='uk-clearfix'>
        <h5 style={{ fontWeight: 300 }}>{t('modals.addTags.title')}</h5>
        <div>
          <form className='nomargin' onSubmit={e => onSubmit(e)}>
            <div className='search-container'>
              <select
                name='tags'
                id='tags'
                className='chosen-select'
                multiple
                data-placeholder=' '
                data-noresults='No Tags Found for '
                ref={selectRef}
              >
                {mappedTags.map(tag => (
                  <option key={tag.value} value={tag.value}>
                    {tag.text}
                  </option>
                ))}
              </select>
              <button type='button' style={{ borderRadius: 0 }} onClick={e => onCreateTagClicked(e)}>
                <i className='material-icons' style={{ marginRight: 0 }}>
                  add
                </i>
              </button>
            </div>

            <div className='left' style={{ marginTop: 15 }}>
              <Button
                type='button'
                text={t('tickets.clear')}
                small
                flat
                style='danger'
                onClick={e => onClearClicked(e)}
              />
            </div>
            <div className='right' style={{ marginTop: 15 }}>
              <Button
                type='button'
                text={t('common.cancel')}
                style='secondary'
                small
                flat
                waves
                extraClass='uk-modal-close'
                ref={closeButtonRef}
              />
              <Button type='submit' text={t('modals.addTags.saveTags')} style='success' small waves />
            </div>
          </form>
        </div>
      </div>
    </BaseModal>
  )
}

AddTagsModal.propTypes = {
  ticketId: PropTypes.string.isRequired,
  currentTags: PropTypes.array,
  tagsSettings: PropTypes.object.isRequired,
  getTagsWithPage: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired,
  showModal: PropTypes.func.isRequired,
  hideModal: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  tagsSettings: state.tagsSettings,
  socket: state.shared.socket
})

export default withTranslation()(connect(mapStateToProps, { getTagsWithPage, showModal, hideModal })(AddTagsModal))
