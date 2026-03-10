import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { withTranslation } from 'react-i18next'

import { setSessionUser, showModal } from 'actions/common'
import { saveEditAccount } from 'actions/accounts'

import Avatar from 'components/Avatar/Avatar'
import PDropdown from 'components/PDropdown'
import Spacer from 'components/Spacer'

import helpers from 'lib/helpers'

function ProfileDropdownPartial ({
  sessionUser,
  setSessionUser: setSessionUserAction,
  showModal: showModalAction,
  saveEditAccount: saveEditAccountAction,
  ref,
  t
}) {
  const [, setKeyboardShortcutsChecked] = useState(true)

  useEffect(() => {
    helpers.ajaxify('#profile-drop')

    if (sessionUser) setKeyboardShortcutsChecked(sessionUser.preferences.keyboardShortcuts)
  }, [])
  useEffect(() => {
    if (sessionUser) {
      setKeyboardShortcutsChecked(sessionUser.preferences.keyboardShortcuts)
    }
  }, [sessionUser])

  return (
    <PDropdown
      ref={ref}
      id='profile-drop'
      className='profile-drop'
      showTitlebar={false}
      minHeight={185} // 255 with keyboard shortcuts
      minWidth={350}
      topOffset={-5}
      leftOffset={-70}
      showArrow={false}
      isListItems={false}
    >
      <div className='pdrop-content'>
        <div className='user-section padding-15 uk-clearfix'>
          <div className='user-info'>
            <Avatar
              image={sessionUser.image || 'defaultProfile.jpg'}
              showOnlineBubble={false}
              style={{ marginLeft: 5, marginRight: 15 }}
              size={60}
            />
            <div className='user-info-items'>
              <span className='uk-text-bold' style={{ fontSize: '16px', lineHeight: '22px' }}>
                {sessionUser.fullname}
              </span>
              <span>{sessionUser.email}</span>
              <a href='/profile'>{t('topbar.profileSettings')}</a>
            </div>
          </div>
        </div>
        {/* <Spacer showBorder={true} borderSize={1} top={0} bottom={0} /> */}
        {/* <div className={'user-action-items'}> */}
        {/*  <EnableSwitch */}
        {/*    label={t('topbar.keyboardShortcuts')} */}
        {/*    sublabel={ */}
        {/*      <> */}
        {/*        {keyboardShortcutsChecked && ( */}
        {/*          <div className={'sub-label'}> */}
        {/*            Press <code>?</code> to view{' '} */}
        {/*            <a href='#' className={'no-ajaxy'}> */}
        {/*              Shortcuts */}
        {/*            </a> */}
        {/*          </div> */}
        {/*        )} */}
        {/*      </> */}
        {/*    } */}
        {/*    stateName={'keyboard-shortcuts-enable-switch'} */}
        {/*    checked={keyboardShortcutsChecked} */}
        {/*    onChange={e => onKeyboardShortcutsChanged(e)} */}
        {/*  /> */}
        {/* </div> */}
        <Spacer showBorder borderSize={1} top={0} bottom={0} />
        {/* <div className={'profile-drop-dark-section'}></div> */}
        {/* <Spacer showBorder={true} borderSize={1} top={0} bottom={0} /> */}
        <div className='profile-drop-actions'>
          <div className='action-logout'>
            <i className='material-icons'>logout</i>
            <a href='/logout'>{t('auth.logout')}</a>
          </div>
        </div>
      </div>
      <div className='pdrop-footer'>
        <div className='links'>
          <a href='https://forum.trudesk.io' target='_blank' rel='noreferrer'>
            {t('topbar.community')}
          </a>
          <span>&middot;</span>
          <a
            href='#'
            className='no-ajaxy'
            onClick={e => {
              e.preventDefault()
              helpers.hideAllpDropDowns()
              showModalAction('PRIVACY_POLICY')
            }}
          >
            {t('topbar.privacyPolicy')}
          </a>
        </div>
      </div>
    </PDropdown>
  )
}

ProfileDropdownPartial.propTypes = {
  sessionUser: PropTypes.object.isRequired,
  setSessionUser: PropTypes.func.isRequired,
  showModal: PropTypes.func.isRequired,
  saveEditAccount: PropTypes.func.isRequired,
  ref: PropTypes.any,
  t: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  sessionUser: state.shared.sessionUser
})

export default withTranslation()(connect(mapStateToProps, { setSessionUser, showModal, saveEditAccount })(
  ProfileDropdownPartial
))
