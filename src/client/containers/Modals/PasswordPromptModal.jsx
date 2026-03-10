import React, { useState, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import { withTranslation } from 'react-i18next'

import { hideModal } from 'actions/common'

import Input from 'components/Input'
import Button from 'components/Button'
import BaseModal from 'containers/Modals/BaseModal'

import axios from 'axios'
import helpers from 'lib/helpers'

const PasswordPromptModal = ({ user, titleOverride, textOverride, onVerifyComplete, hideModal, t }) => {
  const [confirmPassword, setConfirmPassword] = useState('')

  const onVerifyPassword = useCallback(e => {
    e.preventDefault()

    axios
      .post('/api/v2/accounts/profile/mfa/disable', {
        confirmPassword
      })
      .then(res => {
        hideModal()

        if (onVerifyComplete) onVerifyComplete(true)
      })
      .catch(error => {
        let errMessage = t('modals.passwordPrompt.error')
        if (error.response && error.response.data && error.response.data.error) errMessage = error.response.data.error

        helpers.UI.showSnackbar(errMessage, true)

        if (onVerifyComplete) onVerifyComplete(false)
      })
  }, [confirmPassword, hideModal, onVerifyComplete, t])

  return (
    <BaseModal options={{ bgclose: false }}>
      <div>
        <h2>{titleOverride || t('modals.passwordPrompt.title')}</h2>
        <p>{textOverride || t('modals.passwordPrompt.message')}</p>
      </div>
      <div className='uk-margin-medium-bottom'>
        <label>{t('modals.passwordPrompt.currentPassword')}</label>
        <Input name='current-password' type='password' onChange={val => setConfirmPassword(val)} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button text={t('common.cancel')} small flat waves={false} onClick={() => hideModal()} />
        <Button
          text={t('modals.passwordPrompt.verifyPassword')}
          style='primary'
          small
          waves
          onClick={e => onVerifyPassword(e)}
        />
      </div>
    </BaseModal>
  )
}

PasswordPromptModal.propTypes = {
  user: PropTypes.object.isRequired,
  titleOverride: PropTypes.string,
  textOverride: PropTypes.string,
  onVerifyComplete: PropTypes.func.isRequired,
  hideModal: PropTypes.func.isRequired
}

const mapStateToProps = state => ({})

export default withTranslation()(connect(mapStateToProps, { hideModal })(PasswordPromptModal))
