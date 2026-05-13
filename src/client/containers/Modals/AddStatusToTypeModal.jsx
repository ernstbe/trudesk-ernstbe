import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import some from 'lodash/some'
import $ from 'jquery'
import velocity from 'velocity'

import BaseModal from './BaseModal'
import Button from 'components/Button'

import { fetchSettings } from 'actions/settings'
import Log from '../../logger'
import api from 'api/index'

import helpers from 'lib/helpers'

const AddStatusToTypeModal = ({ statuses, type, fetchSettings, t }) => {
  const getStatuses = useCallback(() => {
    return statuses ? statuses.toArray() : []
  }, [statuses])

  const onAddClick = useCallback((e, type, status) => {
    e.preventDefault()
    const $addButton = $(e.target)
    const $check = $addButton.siblings('i.material-icons')

    api.tickets
      .addStatusToType({ typeId: type.get('_id'), status: status.get('_id') })
      .then(() => {
        velocity(
          $addButton,
          { opacity: 0 },
          {
            duration: 350,
            complete: () => {
              $addButton.addClass('hide')
            }
          }
        )
        if ($check.length > 0) {
          velocity(
            $check,
            { opacity: 1 },
            {
              delay: 360,
              duration: 200,
              begin: () => {
                $check.show()
              }
            }
          )
        }

        fetchSettings()
      })
      .catch(error => {
        const errorText = error.response ? error.response.data.error : error.message
        Log.error(errorText, error.response)
        helpers.UI.showSnackbar(`Error: ${errorText}`, true)
      })
  }, [fetchSettings])

  return (
    <BaseModal>
      <form className='uk-form-stacked'>
        <div className='uk-margin-medium-bottom uk-clearfix'>
          <h2>{t('modals.addStatus.title')}</h2>
          <span>{t('modals.addStatus.hint', { typeName: type.get('name') })}</span>
        </div>
        <div className='status-loop zone'>
          {getStatuses().map(status => {
            const alreadyLinked = some(type.get('statuses') ? type.get('statuses').toJS() : [], { _id: status.get('_id') })
            if (alreadyLinked) {
              return (
                <div key={status.get('_id')} className='z-box uk-clearfix'>
                  <div className='uk-float-left'>
                    <h5 style={{ color: status.get('htmlColor'), fontWeight: 'bold' }}>{status.get('name')}</h5>
                  </div>
                  <div className='uk-float-right'>
                    <i className='material-icons uk-text-success mt-10 mr-15' style={{ fontSize: '28px' }}>
                      check
                    </i>
                  </div>
                </div>
              )
            }
            return (
              <div key={status.get('_id')} className='z-box uk-clearfix'>
                <div className='uk-float-left'>
                  <h5 style={{ color: status.get('htmlColor'), fontWeight: 'bold' }}>{status.get('name')}</h5>
                </div>
                <div className='uk-float-right'>
                  <a
                    type='button'
                    className='uk-button uk-button-success mt-10 mr-10 no-ajaxy'
                    onClick={e => onAddClick(e, type, status)}
                  >
                    {t('common.add')}
                  </a>
                  <i
                    className='material-icons uk-text-success mt-10 mr-15'
                    style={{ display: 'none', opacity: 0, fontSize: '28px' }}
                  >
                    check
                  </i>
                </div>
              </div>
            )
          })}
        </div>
        <div className='uk-modal-footer uk-text-right'>
          <Button type='button' flat waves text={t('common.close')} extraClass='uk-modal-close' />
        </div>
      </form>
    </BaseModal>
  )
}

AddStatusToTypeModal.propTypes = {
  statuses: PropTypes.object,
  type: PropTypes.object.isRequired,
  fetchSettings: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  statuses: state.ticketsState.ticketStatuses
})

export default withTranslation()(connect(
  mapStateToProps,
  { fetchSettings }
)(AddStatusToTypeModal))
