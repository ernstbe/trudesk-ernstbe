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
 *  Updated:    2/18/22 10:06 PM
 *  Copyright (c) 2014-2022. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { observer } from 'mobx-react'
import { makeObservable, observable } from 'mobx'
import helpers from 'lib/helpers'
import Log from '../../logger'
import { updateNotice } from 'actions/notices'

import BaseModal from 'containers/Modals/BaseModal'
import { HexColorPicker, HexColorInput } from 'react-colorful'
import { PopoverColorPicker } from 'components/PopoverColorPicker'
import MultiSelect from 'components/MultiSelect'
import Button from 'components/Button'
import $ from 'jquery'

@observer
class EditNoticeModal extends React.Component {
  constructor (props) {
    super(props)

    makeObservable(this)
  }

  @observable name = ''
  @observable message = ''
  @observable color = ''
  @observable fontColor = ''

  componentDidMount () {
    this.name = this.props.notice.name
    this.message = this.props.notice.message
    this.color = this.props.notice.color
    this.fontColor = this.props.notice.fontColor

    helpers.UI.inputs()
    helpers.UI.reRenderInputs()
    helpers.formvalidator()
  }

  componentDidUpdate (prevProps, prevState, snapshot) {
    helpers.UI.reRenderInputs()
  }

  onInputChange (target, e) {
    this[target] = e.target.value
  }

  onFormSubmit (e) {
    e.preventDefault()
    const $form = $(e.target)
    if (!$form.isValid(null, null, false)) return false

    const payload = {
      _id: this.props.notice._id,
      name: this.name,
      message: this.message,
      color: this.color,
      fontColor: this.fontColor
    }

    this.props.updateNotice(payload)
  }

  render () {
    const { t } = this.props
    return (
      <BaseModal {...this.props} options={{ bgclose: false }}>
        <div className={'mb-25'}>
          <h2>{t('modals.editNotice.title')}</h2>
        </div>
        <form className={'uk-form-stacked'} onSubmit={e => this.onFormSubmit(e)}>
          <div className={'uk-margin-medium-bottom'}>
            <label>{t('common.name')}</label>
            <input
              type='text'
              className={'md-input'}
              value={this.name}
              onChange={e => this.onInputChange('name', e)}
              data-validation='length'
              data-validation-length={'min2'}
              data-validation-error-msg={t('modals.createNotice.validName')}
            />
          </div>
          <div className={'uk-margin-medium-bottom'}>
            <label>{t('modals.createNotice.message')}</label>
            <textarea
              className={'md-input'}
              value={this.message}
              onChange={e => this.onInputChange('message', e)}
              data-validation='length'
              data-validation-length={'min10'}
              data-validation-error-msg={t('modals.createNotice.validMessage')}
            />
          </div>
          <div>
            <span style={{ display: 'inline-block', float: 'left', paddingTop: 5 }}>{t('modals.createNotice.backgroundColor')}</span>
            <PopoverColorPicker
              color={this.color}
              onChange={c => {
                this.color = c
              }}
              style={{ float: 'left', marginLeft: 5, marginRight: 15 }}
            />
            <span style={{ display: 'inline-block', float: 'left', paddingTop: 5 }}>{t('modals.createNotice.fontColor')}</span>
            <PopoverColorPicker
              color={this.fontColor}
              onChange={c => {
                this.fontColor = c
              }}
              style={{ float: 'left', marginLeft: 5 }}
            />
          </div>

          <div className='uk-modal-footer uk-text-right'>
            <Button text={t('common.close')} flat={true} waves={true} extraClass={'uk-modal-close'} />
            <Button text={t('modals.editNotice.saveButton')} flat={true} waves={true} style={'primary'} type={'submit'} />
          </div>
        </form>
      </BaseModal>
    )
  }
}

EditNoticeModal.propTypes = {
  notice: PropTypes.object.isRequired,
  updateNotice: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({})

export default withTranslation()(connect(mapStateToProps, { updateNotice })(EditNoticeModal))
