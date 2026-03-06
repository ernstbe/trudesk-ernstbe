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
 *  Updated:    2/6/19 12:30 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import BaseModal from './BaseModal'
import Button from 'components/Button'

import { createTag } from 'actions/tickets'

class CreateTagModal extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      name: ''
    }
  }

  onNameChange (e) {
    this.setState({
      name: e.target.value
    })
  }

  onSubmit (e) {
    e.preventDefault()
    if (this.props.page === 'settings')
      return this.props.createTag({ name: this.state.name, currentPage: this.props.currentPage })

    this.props.createTag({ name: this.state.name })
  }

  render () {
    const { t } = this.props
    return (
      <BaseModal>
        <form className='uk-form-stacked' onSubmit={e => this.onSubmit(e)}>
          <div>
            <h2 className={'nomargin mb-5'}>{t('modals.createTag.title')}</h2>
            <p className='uk-text-muted'>{t('modals.createTag.hint')}</p>

            <label>{t('modals.createTag.tagName')}</label>
            <input
              type='text'
              className={'md-input'}
              name={'name'}
              data-validation='length'
              data-validation-length='min2'
              data-validation-error-msg={t('modals.createTag.validName')}
              value={this.state.name}
              onChange={e => this.onNameChange(e)}
            />
          </div>
          <div className='uk-modal-footer uk-text-right'>
            <Button text={t('common.close')} extraClass={'uk-modal-close'} flat={true} waves={true} />
            <Button text={t('common.create')} type={'submit'} flat={true} waves={true} style={'success'} />
          </div>
        </form>
      </BaseModal>
    )
  }
}

CreateTagModal.propTypes = {
  createTag: PropTypes.func.isRequired,
  page: PropTypes.string,
  currentPage: PropTypes.number,
  t: PropTypes.func.isRequired
}

export default withTranslation()(connect(
  null,
  { createTag }
)(CreateTagModal))
