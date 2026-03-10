import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation, Trans } from 'react-i18next'
import axios from 'axios'
import moment from 'moment-timezone'

import { saveProfile, genMFA } from 'actions/accounts'
import { showModal, hideModal, setSessionUser } from 'actions/common'

import PageTitle from 'components/PageTitle'
import PageContent from 'components/PageContent'
import TruCard from 'components/TruCard'
import Avatar from 'components/Avatar/Avatar'
import Button from 'components/Button'
import Spacer from 'components/Spacer'
import TruTabWrapper from 'components/TruTabs/TruTabWrapper'
import TruTabSelectors from 'components/TruTabs/TruTabSelectors'
import TruTabSelector from 'components/TruTabs/TruTabSelector'
import TruTabSection from 'components/TruTabs/TruTabSection'
import Input from 'components/Input'
import QRCode from 'components/QRCode'
import TruAccordion from 'components/TruAccordion'
import SingleSelect from 'components/SingleSelect'

import helpers from 'lib/helpers'

function ProfileContainer ({
  t,
  sessionUser,
  setSessionUser: setSessionUserAction,
  socket,
  showModal: showModalAction,
  hideModal: hideModalAction,
  saveProfile: saveProfileAction,
  genMFA: genMFAAction
}) {
  const [editingProfile, setEditingProfile] = useState(false)

  const [fullname, setFullname] = useState(null)
  const [title, setTitle] = useState(null)
  const [email, setEmail] = useState(null)
  const [workNumber, setWorkNumber] = useState(null)
  const [mobileNumber, setMobileNumber] = useState(null)
  const [companyName, setCompanyName] = useState(null)
  const [facebookUrl, setFacebookUrl] = useState(null)
  const [linkedinUrl, setLinkedinUrl] = useState(null)
  const [twitterUrl, setTwitterUrl] = useState(null)

  // Security
  // -- Password
  const [currentPassword, setCurrentPassword] = useState(null)
  const [newPassword, setNewPassword] = useState(null)
  const [confirmPassword, setConfirmPassword] = useState(null)
  // -- Two Factor
  const [l2Key, setL2Key] = useState(null)
  const [l2URI, setL2URI] = useState(null)
  const [l2Step2, setL2Step2] = useState(null)
  const [l2ShowCantSeeQR, setL2ShowCantSeeQR] = useState(null)
  const [l2VerifyText, setL2VerifyText] = useState(null)

  // Prefs
  const [timezone, setTimezone] = useState(null)

  useEffect(() => {
    // This will update the profile with the latest values
    setSessionUserAction()
  }, [])

  useEffect(() => {
    if (sessionUser) {
      setFullname(sessionUser.fullname)
      setTitle(sessionUser.title)
      setEmail(sessionUser.email)
      setWorkNumber(sessionUser.workNumber)
      setMobileNumber(sessionUser.mobileNumber)
      setCompanyName(sessionUser.companyName)
      setFacebookUrl(sessionUser.facebookUrl)
      setLinkedinUrl(sessionUser.linkedinUrl)
      setTwitterUrl(sessionUser.twitterUrl)

      if (sessionUser.preferences) {
        setTimezone(sessionUser.preferences.timezone)
      }
    }
  }, [sessionUser])

  const _validateEmail = useCallback((emailVal) => {
    if (!emailVal) return false
    return emailVal
      .toString()
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      )
  }, [])

  const _getTimezones = useCallback(() => {
    return moment.tz
      .names()
      .map(function (name) {
        const year = new Date().getUTCFullYear()
        const timezoneAtBeginningOfyear = moment.tz(year + '-01-01', name)
        return {
          utc: timezoneAtBeginningOfyear.utcOffset(),
          text: '(GMT' + timezoneAtBeginningOfyear.format('Z') + ') ' + name,
          value: name
        }
      })
      .sort(function (a, b) {
        return a.utc - b.utc
      })
  }, [])

  const onTimezoneSelectChange = useCallback((e) => {
    setTimezone(e.target.value)
  }, [])

  const onSaveProfileClicked = useCallback((e) => {
    e.preventDefault()
    if ((fullname && fullname.length) > 50 || (email && email.length > 50)) {
      helpers.UI.showSnackbar(t('profile.fieldTooLong'), true)
      return
    }

    if (!_validateEmail(email)) {
      helpers.UI.showSnackbar(t('profile.invalidEmail'), true)
      return
    }

    saveProfileAction({
      _id: sessionUser._id,
      username: sessionUser.username,

      fullname,
      title,
      workNumber,
      mobileNumber,
      companyName,
      facebookUrl,
      linkedinUrl,
      twitterUrl,
      preferences: {
        timezone
      }
    })
      .then(() => {
        setEditingProfile(false)
        helpers.forceSessionUpdate().then(() => {
          setSessionUserAction()
          helpers.UI.showSnackbar(t('profile.profileSaved'))
        })
      })
  }, [fullname, title, email, workNumber, mobileNumber, companyName, facebookUrl, linkedinUrl, twitterUrl, timezone, sessionUser, saveProfileAction, setSessionUserAction, _validateEmail, t])

  const onUpdatePasswordClicked = useCallback((e) => {
    e.preventDefault()

    if (!currentPassword || !newPassword || !confirmPassword) {
      helpers.UI.showSnackbar(t('profile.invalidFormData'))
      return
    }

    if (currentPassword.length < 4 || newPassword.length < 4 || confirmPassword.length < 4) {
      helpers.UI.showSnackbar(t('profile.passwordTooShort'), true)
      return
    }

    if (currentPassword.length > 255 || newPassword.length > 255 || confirmPassword.length > 255) {
      helpers.UI.showSnackbar(t('profile.passwordTooLong'), true)
      return
    }

    axios
      .post('/api/v2/accounts/profile/update-password', {
        currentPassword,
        newPassword,
        confirmPassword
      })
      .then(res => {
        if (res.data && res.data.success) {
          helpers.UI.showSnackbar(t('profile.passwordUpdated'))
          setTimeout(() => {
            window.location.reload()
          }, 1000)
        }
      })
      .catch(error => {
        let errorMsg = t('profile.invalidRequest')
        if (error && error.response && error.response.data && error.response.data.error) { errorMsg = error.response.data.error }

        helpers.UI.showSnackbar(errorMsg, true)
      })
  }, [currentPassword, newPassword, confirmPassword, t])

  const onEnableMFAClicked = useCallback((e) => {
    e.preventDefault()
    genMFAAction({
      _id: sessionUser._id,
      username: sessionUser.username
    })
      .then(res => {
        setL2Key(res.key)
        setL2URI(res.uri)
        setL2Step2(true)
      })
  }, [sessionUser, genMFAAction])

  const onVerifyMFAClicked = useCallback((e) => {
    e.preventDefault()
    axios
      .post('/api/v2/accounts/profile/mfa/verify', {
        tOTPKey: l2Key,
        code: l2VerifyText
      })
      .then(res => {
        if (res.data && res.data.success) {
          // Refresh Session User
          setSessionUserAction()
          setL2Step2(null)
          setL2ShowCantSeeQR(null)
        }
      })
      .catch(e => {
        if (e.response && e.response.data && e.response.data.error) {
          helpers.UI.showSnackbar(e.response.data.error, true)
        }
      })
  }, [l2Key, l2VerifyText, setSessionUserAction])

  const onDisableMFAClicked = useCallback((e) => {
    e.preventDefault()
    const onVerifyComplete = success => {
      if (success) {
        setL2Step2(null)
        setL2ShowCantSeeQR(null)
        setSessionUserAction()
      }
    }

    showModalAction('PASSWORD_PROMPT', { user: sessionUser, onVerifyComplete })
  }, [sessionUser, showModalAction, setSessionUserAction])

  // return (
  //   <div>
  //     <PageTitle title={'Dashboard'} />
  //     <PageContent>
  //       <RGrid />
  //     </PageContent>
  //   </div>
  // )
  if (!sessionUser) return <div />

  const InfoItem = ({ label, prop, paddingLeft, paddingRight, isRequired, onUpdate }) => {
    return (
      <div style={{ width: '33%', paddingRight, paddingLeft }}>
        <label style={{ cursor: 'default', fontSize: '13px', fontWeight: 400, marginRight: 15 }}>
          {label}
          {isRequired && <span style={{ color: 'red' }}>*</span>}
        </label>
        <Spacer top={5} bottom={0} />
        {editingProfile && <Input defaultValue={prop || ''} onChange={onUpdate} />}
        {!editingProfile && (
          <p
            style={{
              fontSize: '14px',
              lineHeight: '21px',
              margin: 0,
              fontWeight: 600,
              textOverflow: 'ellipsis',
              overflow: 'hidden'
            }}
          >
            {prop || '-'}
          </p>
        )}
      </div>
    )
  }

  return (
    <>
      <PageTitle title={t('profile.title')} />
      <PageContent>
        <TruCard
          header={<div />}
          hover={false}
          content={
            <>
              <div className='uk-position-relative'>
                <Avatar
                  userId={sessionUser._id}
                  image={sessionUser.image}
                  enableImageUpload
                  username={sessionUser.username}
                  socket={socket}
                  showOnlineBubble={false}
                  showBorder
                  size={72}
                />
                <div className='uk-clearfix' style={{ paddingLeft: 85 }}>
                  <h2
                    className='ml-15'
                    style={{ fontSize: 24, lineHeight: '36px', letterSpacing: '0.5px', fontWeight: 600 }}
                  >
                    {sessionUser.fullname}
                  </h2>
                  <p className='ml-15' style={{ lineHeight: '9px' }}>
                    <span style={{ marginRight: 10 }}>{sessionUser.email}</span>|
                    <span style={{ margin: '0 10px' }}>{sessionUser.title}</span>|
                    <span
                      style={{
                        boxSizing: 'border-box',
                        margin: '0 10px',
                        padding: '5px 8px',
                        background: '#d9eeda',
                        border: '1px solid #b5dfb7',
                        borderRadius: 3,
                        color: '#4caf50'
                      }}
                    >
                      {sessionUser.role.name.toUpperCase()}
                    </span>
                  </p>
                </div>
                <Button
                  text={t('profile.editProfile')}
                  small
                  waves
                  style='primary'
                  styleOverride={{ position: 'absolute', top: '5px', right: 5 }}
                  disabled={editingProfile}
                  onClick={() => {
                    setFullname(sessionUser.fullname)
                    setEditingProfile(!editingProfile)
                  }}
                />
              </div>
            </>
          }
        />
        <Spacer />
        <TruCard
          hover={false}
          content={
            <div>
              <TruTabWrapper style={{ padding: '0' }}>
                <TruTabSelectors showTrack>
                  <TruTabSelector selectorId={0} label={t('profile.title')} active />
                  <TruTabSelector selectorId={1} label={t('profile.security')} />
                  <TruTabSelector selectorId={2} label={t('profile.preferences')} />
                </TruTabSelectors>
                <TruTabSection sectionId={0} active style={{ minHeight: 480 }}>
                  <div style={{ maxWidth: 900, padding: '10px 25px' }}>
                    <h4 style={{ marginBottom: 15 }}>{t('profile.workInformation')}</h4>
                    <div style={{ display: 'flex' }}>
                      <InfoItem
                        label={t('profile.name')}
                        prop={sessionUser.fullname}
                        paddingLeft={0}
                        paddingRight={30}
                        isRequired
                        onUpdate={val => setFullname(val)}
                      />
                      <InfoItem
                        label={t('profile.titleField')}
                        prop={sessionUser.title}
                        paddingLeft={30}
                        paddingRight={30}
                        onUpdate={val => setTitle(val)}
                      />
                      <InfoItem
                        label={t('profile.companyName')}
                        prop={sessionUser.companyName}
                        paddingRight={0}
                        paddingLeft={30}
                        onUpdate={val => setCompanyName(val)}
                      />
                    </div>
                    <div style={{ display: 'flex', marginTop: 25 }}>
                      <InfoItem
                        label={t('profile.workNumber')}
                        prop={sessionUser.workNumber}
                        paddingRight={30}
                        paddingLeft={0}
                        onUpdate={val => setWorkNumber(val)}
                      />
                      <InfoItem
                        label={t('profile.mobileNumber')}
                        prop={sessionUser.mobileNumber}
                        paddingLeft={30}
                        paddingRight={0}
                        onUpdate={val => setMobileNumber(val)}
                      />
                    </div>
                    <Spacer top={25} bottom={25} showBorder />
                    <h4 style={{ marginBottom: 15 }}>{t('profile.otherInformation')}</h4>
                    <div style={{ display: 'flex', marginTop: 25 }}>
                      <InfoItem
                        label={t('profile.facebookUrl')}
                        prop={sessionUser.facebookUrl}
                        paddingLeft={0}
                        paddingRight={30}
                        onUpdate={val => setFacebookUrl(val)}
                      />
                      <InfoItem
                        label={t('profile.linkedinUrl')}
                        prop={sessionUser.linkedinUrl}
                        paddingLeft={30}
                        paddingRight={30}
                        onUpdate={val => setLinkedinUrl(val)}
                      />
                      <InfoItem
                        label={t('profile.twitterUrl')}
                        prop={sessionUser.twitterUrl}
                        paddingLeft={30}
                        paddingRight={0}
                        onUpdate={val => setTwitterUrl(val)}
                      />
                    </div>
                    {editingProfile && (
                      <div className='uk-display-flex uk-margin-large-top'>
                        <Button
                          text={t('common.save')}
                          style='primary'
                          small
                          onClick={e => onSaveProfileClicked(e)}
                        />
                        <Button text={t('common.cancel')} small onClick={() => setEditingProfile(false)} />
                      </div>
                    )}
                  </div>
                </TruTabSection>
                <TruTabSection sectionId={1} style={{ minHeight: 480 }}>
                  <div style={{ maxWidth: 600, padding: '25px 0' }}>
                    <TruAccordion
                      headerContent={t('profile.changePassword')}
                      content={
                        <div>
                          <form onSubmit={e => onUpdatePasswordClicked(e)}>
                            <div
                              className='uk-alert uk-alert-warning'
                              style={{ display: 'flex', alignItems: 'center' }}
                            >
                              <i className='material-icons mr-10' style={{ opacity: 0.5 }}>
                                info
                              </i>
                              <p style={{ lineHeight: '18px' }}>
                                {t('profile.passwordWarning')}
                              </p>
                            </div>
                            <div>
                              <div className='uk-margin-medium-bottom'>
                                <label>{t('profile.currentPassword')}</label>
                                <Input type='password' onChange={v => setCurrentPassword(v)} />
                              </div>
                              <div className='uk-margin-medium-bottom'>
                                <label>{t('profile.newPassword')}</label>
                                <Input type='password' onChange={v => setNewPassword(v)} />
                              </div>
                              <div className='uk-margin-medium-bottom'>
                                <label>{t('profile.confirmPassword')}</label>
                                <Input type='password' onChange={v => setConfirmPassword(v)} />
                              </div>
                            </div>
                            <div>
                              <Button
                                type='submit'
                                text={t('profile.updatePassword')}
                                style='primary'
                                small
                                extraClass='uk-width-1-1'
                                onClick={e => onUpdatePasswordClicked(e)}
                              />
                            </div>
                          </form>
                        </div>
                      }
                    />
                    <TruAccordion
                      headerContent={t('profile.twoFactorAuth')}
                      content={
                        <div>
                          {!sessionUser.hasL2Auth && (
                            <div>
                              {!l2Step2 && (
                                <div>
                                  <h4 style={{ fontWeight: 500 }}>{t('profile.twoFactorNotEnabled')}</h4>
                                  <p style={{ fontSize: '12px', fontWeight: 400 }}>
                                    {t('profile.twoFactorDescription')}
                                  </p>
                                  <div>
                                    <Button
                                      text={t('settings.enable')}
                                      style='primary'
                                      small
                                      waves
                                      onClick={e => onEnableMFAClicked(e)}
                                    />
                                  </div>
                                </div>
                              )}
                              {l2Step2 && (
                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                  <div style={{ width: 400 }}>
                                    <div style={{ display: 'flex', marginTop: 15, flexDirection: 'column' }}>
                                      <p style={{ fontWeight: 500, marginBottom: 40 }}>
                                        {t('profile.scanQrCode')}
                                      </p>
                                      <div style={{ alignSelf: 'center', marginBottom: 40 }}>
                                        <div>
                                          <QRCode
                                            size={180}
                                            code={l2URI || 'INVALID_CODE'}
                                            css={{ marginBottom: 5 }}
                                          />
                                          <a
                                            href='#'
                                            style={{
                                              display: 'inline-block',
                                              fontSize: '12px',
                                              width: '100%',
                                              textAlign: 'right'
                                            }}
                                            onClick={e => {
                                              e.preventDefault()
                                              setL2ShowCantSeeQR(true)
                                            }}
                                          >
                                            {t('profile.cantScanQr')}
                                          </a>
                                        </div>
                                      </div>
                                      {l2ShowCantSeeQR && (
                                        <div style={{ alignSelf: 'center', marginBottom: 15 }}>
                                          <p style={{ fontSize: '13px' }}>
                                            {t('profile.manualKeyHint')}
                                          </p>
                                          <p style={{ textAlign: 'center' }}>
                                            <span
                                              style={{
                                                display: 'inline-block',
                                                padding: '5px 25px',
                                                background: 'white',
                                                color: 'black',
                                                fontWeight: 500,
                                                border: '1px solid rgba(0,0,0,0.1)'
                                              }}
                                            >
                                              {l2Key}
                                            </span>
                                          </p>
                                        </div>
                                      )}
                                      <p style={{ fontWeight: 500 }}>
                                        {t('profile.verifyCodeHint')}
                                      </p>
                                      <label>{t('profile.verificationCode')}</label>
                                      <Input type='text' onChange={val => setL2VerifyText(val)} />
                                      <div style={{ marginTop: 25 }}>
                                        <Button
                                          text={t('profile.verifyAndContinue')}
                                          style='primary'
                                          small
                                          waves
                                          extraClass='uk-width-1-1'
                                          onClick={e => onVerifyMFAClicked(e)}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          {sessionUser.hasL2Auth && (
                            <div>
                              <h4 style={{ fontWeight: 500 }}>
                                <Trans i18nKey='profile.twoFactorEnabled'>
                                  Two-factor authentication is{' '}
                                  <span className='uk-text-success' style={{ fontWeight: 600 }}>
                                    enabled
                                  </span>
                                </Trans>
                              </h4>
                              <p style={{ fontSize: '12px' }}>
                                {t('profile.twoFactorDisableHint')}
                              </p>
                              <div>
                                <Button
                                  text='Disable'
                                  style='danger'
                                  small
                                  onClick={e => onDisableMFAClicked(e)}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      }
                    />
                  </div>
                </TruTabSection>
                <TruTabSection sectionId={2} style={{ minHeight: 480 }}>
                  <div style={{ maxWidth: 450, padding: '10px 25px' }}>
                    <h4 style={{ marginBottom: 15 }}>{t('profile.uiPreferences')}</h4>
                    <div className='uk-clearfix uk-margin-large-bottom'>
                      <label style={{ fontSize: '13px' }}>{t('profile.timezone')}</label>
                      <SingleSelect
                        items={_getTimezones()}
                        defaultValue={timezone || undefined}
                        onSelectChange={e => onTimezoneSelectChange(e)}
                      />
                    </div>
                    <div>
                      <Button
                        text={t('profile.savePreferences')}
                        style='primary'
                        small
                        type='button'
                        onClick={e => onSaveProfileClicked(e)}
                      />
                    </div>
                  </div>
                </TruTabSection>
              </TruTabWrapper>
            </div>
          }
        />
      </PageContent>
    </>
  )
}

ProfileContainer.propTypes = {
  t: PropTypes.func.isRequired,
  sessionUser: PropTypes.object,
  setSessionUser: PropTypes.func.isRequired,
  socket: PropTypes.object.isRequired,
  showModal: PropTypes.func.isRequired,
  hideModal: PropTypes.func.isRequired,
  saveProfile: PropTypes.func.isRequired,
  genMFA: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  sessionUser: state.shared.sessionUser,
  socket: state.shared.socket
})

export default withTranslation()(connect(mapStateToProps, { showModal, hideModal, saveProfile, setSessionUser, genMFA })(ProfileContainer))
