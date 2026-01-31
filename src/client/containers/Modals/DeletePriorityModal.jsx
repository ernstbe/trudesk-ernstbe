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
 *  Updated:    2/5/19 12:26 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import BaseModal from './BaseModal'
import SingleSelect from 'components/SingleSelect'
import Button from 'components/Button'

import { deletePriority } from 'actions/tickets'

import helpers from 'lib/helpers'

class DeletePriorityModal extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      selectedPriority: ''
    }
  }

  onSubmit (e) {
    e.preventDefault()
    if (!this.state.selectedPriority) {
      helpers.UI.showSnackbar('Unable to get new priority. Aborting...', true)
      return true
    }

    this.props.deletePriority({ id: this.props.priority.get('_id'), newPriority: this.state.selectedPriority })
  }

  getPriorities () {
    return this.props.settings && this.props.settings.get('priorities')
      ? this.props.settings.get('priorities').toArray()
      : []
  }

  onSelectChanged (e) {
    this.setState({
      selectedPriority: e.target.value
    })
  }

  render () {
    const { priority, t } = this.props
    const mappedPriorities = this.getPriorities()
      .filter(obj => {
        return priority.get('name') !== obj.get('name')
      })
      .map(p => {
        return { text: t('priorities.' + p.get('name'), p.get('name')), value: p.get('_id') }
      })
    return (
      <BaseModal>
        <div>
          <form onSubmit={e => this.onSubmit(e)}>
            <div className='uk-margin-medium-bottom uk-clearfix'>
              <h2>{t('modals.deletePriority.title')}</h2>
              <span>{t('modals.deletePriority.hint')}</span>
              <hr style={{ margin: '10px 0' }} />
            </div>
            <div className='uk-margin-medium-bottom uk-clearfix'>
              <div className='uk-float-left' style={{ width: '100%' }}>
                <label className={'uk-form-label'}>{t('common.priority')}</label>
                <SingleSelect
                  items={mappedPriorities}
                  showTextbox={false}
                  width={'100%'}
                  value={this.state.selectedPriority}
                  onSelectChange={e => this.onSelectChanged(e)}
                />
              </div>
            </div>
            <div className='uk-margin-medium-bottom uk-clearfix'>
              <span className='uk-text-danger'>
                {t('modals.deletePriority.warning')} <strong>{t('priorities.' + priority.get('name'), priority.get('name'))}</strong> {t('modals.deletePriority.toSelected')}
              </span>
            </div>
            <div className='uk-modal-footer uk-text-right'>
              <Button type={'button'} flat={true} waves={true} text={t('common.cancel')} extraClass={'uk-modal-close'} />
              <Button type={'submit'} flat={true} waves={true} text={t('common.delete')} style={'danger'} />
            </div>
          </form>
        </div>
      </BaseModal>
    )
  }
}

DeletePriorityModal.propTypes = {
  priority: PropTypes.object.isRequired,
  settings: PropTypes.object.isRequired,
  deletePriority: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(
  mapStateToProps,
  { deletePriority }
)(DeletePriorityModal))
