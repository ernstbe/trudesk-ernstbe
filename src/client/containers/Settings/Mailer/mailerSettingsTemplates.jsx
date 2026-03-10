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
 *  Updated:    3/3/19 1:03 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'
import { updateSetting } from 'actions/settings'
import Log from '../../../logger'
import axios from 'axios'

import Button from 'components/Button'
import SettingItem from 'components/Settings/SettingItem'
import EnableSwitch from 'components/Settings/EnableSwitch'
import SplitSettingsPanel from 'components/Settings/SplitSettingsPanel'

import helpers from 'lib/helpers'
import Zone from 'components/ZoneBox/zone'
import ZoneBox from 'components/ZoneBox'

const templateBody = ({ template, handleSaveSubject, handleOpenEditor, t }) => (
  <div>
    <h3 className='font-light mb-5'>{t('settings.templateDescription')}</h3>
    <p className='mb-10' style={{ fontSize: '13px' }}>
      {template.description}
    </p>
    <hr className='uk-margin-medium-bottom' />
    <form onSubmit={handleSaveSubject}>
      <input name='id' type='hidden' value={template._id} />
      <div className='uk-input-group'>
        <div className='md-input-wrapper'>
          <label>{t('settings.mailSubject')}</label>
          <input name='subject' type='text' className='md-input' defaultValue={template.subject} />
        </div>
        <span className='uk-input-group-addon'>
          <Button type='submit' text={t('common.save')} small />
        </span>
      </div>
    </form>

    <Zone extraClass='uk-margin-medium-top'>
      <ZoneBox>
        <div className='uk-float-left'>
          <h6 style={{ margin: 0, fontSize: '16px', lineHeight: '14px' }}>{t('settings.editTemplate')}</h6>
          <h5 className='uk-text-muted' style={{ margin: '2px 0 0 0', fontSize: '12px' }}>
            {t('settings.editTemplateHint')}
          </h5>
        </div>
        <div className='uk-float-right uk-width-1-3 uk-clearfix'>
          <div className='uk-width-1-1 uk-float-right' style={{ textAlign: 'right' }}>
            <button
              className='md-btn md-btn-small right disabled'
              style={{ textTransform: 'none' }}
              onClick={handleOpenEditor}
              disabled
            >
              {t('settings.openEditor')}
            </button>
          </div>
        </div>
      </ZoneBox>
    </Zone>
  </div>
)

templateBody.propTypes = {
  template: PropTypes.object.isRequired,
  handleSaveSubject: PropTypes.func.isRequired,
  handleOpenEditor: PropTypes.func.isRequired,
  t: PropTypes.func.isRequired
}

function onOpenEditor (e, name) {
  e.preventDefault()
  const url = `/settings/editor/${name}/`
  History.pushState(null, null, url)
}

const MailerSettingsTemplates = ({ updateSetting, settings, t }) => {
  const [betaEnabled, setBetaEnabled] = useState(false)
  const [templates, setTemplates] = useState([])

  useEffect(() => {
    helpers.UI.inputs()
  }, [])

  useEffect(() => {
    helpers.UI.reRenderInputs()
  })

  useEffect(() => {
    const newBetaEnabled = getSetting('emailBeta')
    if (betaEnabled !== newBetaEnabled) setBetaEnabled(newBetaEnabled)
    const mailTemplates = settings.get('mailTemplates')
    if (mailTemplates) {
      setTemplates(mailTemplates.toArray())
    }
  }, [settings])

  const getSetting = useCallback(
    name => {
      return settings.getIn(['settings', name, 'value']) !== undefined
        ? settings.getIn(['settings', name, 'value'])
        : ''
    },
    [settings]
  )

  const onEmailBetaChange = useCallback(
    e => {
      const val = e.target.checked
      updateSetting({ name: 'beta:email', value: val, stateName: 'betaEmail', noSnackbar: true }).then(() => {
        setBetaEnabled(val)
      })
    },
    [updateSetting]
  )

  const onSaveSubject = useCallback(
    e => {
      e.preventDefault()
      const subject = e.target.subject
      if (!subject) return
      axios
        .put(`/api/v1/settings/mailer/template/${e.target.id.value}`, {
          subject: subject.value
        })
        .then(res => {
          if (res.data && res.data.success) helpers.UI.showSnackbar(t('settings.templateSaved'))
        })
        .catch(error => {
          const errorText = error.response ? error.response.error : error
          helpers.UI.showSnackbar(`Error: ${errorText}`, true)
          Log.error(errorText, error)
        })
    },
    [t]
  )

  const mapTemplateMenu = useCallback(() => {
    return templates.map((template, idx) => {
      const templateJS = template.toJS()
      return {
        key: idx,
        title: template.get('displayName'),
        bodyComponent: templateBody({
          template: templateJS,
          handleSaveSubject: e => onSaveSubject(e),
          handleOpenEditor: e => onOpenEditor(e, templateJS.name),
          t
        })
      }
    })
  }, [templates, onSaveSubject, t])

  const mappedValues = mapTemplateMenu()

  return (
    <div>
      <SettingItem
        title={t('settings.enableNewEmailTemplates')}
        subtitle={
          <div>
            {t('settings.enableNewEmailTemplatesHint')}{' '}
            <a href='https://forum.trudesk.io/t/beta-email-notification-templates'>Email Notification Templates</a>
          </div>
        }
        component={
          <EnableSwitch
            stateName='emailBeta'
            label={t('settings.enable')}
            checked={betaEnabled}
            onChange={e => onEmailBetaChange(e)}
          />
        }
      />
      <SplitSettingsPanel
        title={t('settings.notificationTemplates')}
        subtitle={
          <div>
            {t('settings.notificationTemplatesHint')}
            <strong> {t('settings.notificationTemplatesNote')}</strong>
          </div>
        }
        rightComponent={<h4 className='uk-display-block uk-text-danger mt-20 mr-20'>{t('settings.betaFeature')}</h4>}
        menuItems={mappedValues}
      />
    </div>
  )
}

MailerSettingsTemplates.propTypes = {
  updateSetting: PropTypes.func.isRequired,
  settings: PropTypes.object.isRequired,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  settings: state.settings.settings
})

export default withTranslation()(connect(mapStateToProps, { updateSetting })(MailerSettingsTemplates))
