import React, { useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import ReactHotkeys from 'react-hot-keys'

const keyList = ['g+d', 'g+t', 'shift+/']

function HotKeysGlobal ({ sessionUser }) {
  const onKeyDown = useCallback((keyName, e, handle) => {
    // Route Change
    if (keyName === 'g+d') History.pushState(null, null, '/dashboard')
    if (keyName === 'g+t') History.pushState(null, null, '/tickets/active')

    if (keyName === 'ctrl+g') console.log('split key')

    // Help
    if (keyName === 'shift+/') console.log('Show shortcut help')
  }, [])

  const hasKeyboardShortcutEnabled = sessionUser
    ? sessionUser.preferences.keyboardShortcuts
    : true

  return (
    <>
      {hasKeyboardShortcutEnabled && (
        <ReactHotkeys keyName={keyList.join(',')} onKeyDown={onKeyDown} />
      )}
    </>
  )
}

HotKeysGlobal.propTypes = {
  sessionUser: PropTypes.object
}

const mapStateToProps = state => ({
  sessionUser: state.shared.sessionUser
})

export default connect(mapStateToProps, {})(HotKeysGlobal)
