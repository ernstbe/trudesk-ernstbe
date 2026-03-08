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
 *  Updated:    2/4/19 1:44 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { deleteTicketType } from 'actions/tickets'
import BaseModal from './BaseModal'
import Button from 'components/Button'
import SingleSelect from 'components/SingleSelect'

import helpers from 'lib/helpers'

const DeleteTicketTypeModal = ({ type, settings, deleteTicketType, t, ...rest }) => {
  const [selectedType, setSelectedType] = useState('')

  const getTicketTypes = useCallback(() => {
    return settings && settings.get('ticketTypes')
      ? settings.get('ticketTypes').toArray()
      : []
  }, [settings])

  const onSelectChanged = useCallback((e) => {
    setSelectedType(e.target.value)
  }, [])

  const onFormSubmit = useCallback((e) => {
    e.preventDefault()
    if (!selectedType) {
      helpers.UI.showSnackbar('Unable to get new ticket type. Aborting...', true)
      return true
    }

    deleteTicketType(type.get('_id'), selectedType)
  }, [selectedType, type, deleteTicketType])

  const mappedTypes = getTicketTypes()
    .filter(obj => {
      return type.get('name') !== obj.get('name')
    })
    .map(item => {
      return { text: item.get('name'), value: item.get('_id') }
    })

  return (
    <BaseModal {...rest} type={type} settings={settings} deleteTicketType={deleteTicketType} t={t} options={{ bgclose: false }}>
      <form className='uk-form-stacked' onSubmit={e => onFormSubmit(e)}>
        <div className='uk-margin-medium-bottom uk-clearfix'>
          <h2>{t('modals.deleteType.title')}</h2>
          <span>{t('modals.deleteType.hint')}</span>
        </div>
        <div className='uk-margin-medium-bottom uk-clearfix'>
          <div className='uk-float-left' style={{ width: '100%' }}>
            <label className='uk-form-label nopadding nomargin'>{t('common.type')}</label>
            <SingleSelect
              showTextbox={false}
              items={mappedTypes}
              onSelectChange={e => onSelectChanged(e)}
              value={selectedType}
            />
          </div>
        </div>
        <div className='uk-margin-medium-bottom uk-clearfix'>
          <span className='uk-text-danger'>
            {t('modals.deleteType.warning')} <strong>{type.get('name')}</strong> {t('modals.deleteType.toSelected')}
            <br />
            <strong>{t('modals.deleteRole.permanent')}</strong>
          </span>
        </div>
        <div className='uk-modal-footer uk-text-right'>
          <Button text={t('common.cancel')} flat waves extraClass='uk-modal-close' />
          <Button text={t('common.delete')} style='danger' flat type='submit' />
        </div>
      </form>
    </BaseModal>
  )
}

DeleteTicketTypeModal.propTypes = {
  type: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired,
  deleteTicketType: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(
  mapStateToProps,
  { deleteTicketType }
)(DeleteTicketTypeModal))
