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
 *  Updated:    1/20/19 4:46 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'

import helpers from 'lib/helpers'

import { updateSetting } from 'actions/settings'

const InputWithSave = ({ updateSetting, settingName, stateName, saveLabel, initialValue, width }) => {
  const [value, setValue] = useState('')

  useEffect(() => {
    setValue(initialValue || '')
    helpers.UI.inputs()
  }, [])

  useEffect(() => {
    if (typeof initialValue !== 'undefined') {
      setValue(initialValue)
    }
  }, [initialValue])

  const onSaveClicked = useCallback(() => {
    updateSetting({ name: settingName, value, stateName })
  }, [updateSetting, settingName, value, stateName])

  const updateValue = useCallback((evt) => {
    setValue(evt.target.value)
  }, [])

  const w = width || '100%'

  return (
    <div className='uk-width-1-1 uk-float-right' style={{ width: w }}>
      <div className='uk-width-3-4 uk-float-left' style={{ paddingRight: '10px' }}>
        <input
          id={stateName}
          className='md-input md-input-width-medium'
          type='text'
          value={value}
          onChange={updateValue}
        />
      </div>
      <div className='uk-width-1-4 uk-float-right' style={{ marginTop: '10px', textAlign: 'center' }}>
        <button className='md-btn md-btn-small' onClick={onSaveClicked}>
          {saveLabel || 'Save'}
        </button>
      </div>
    </div>
  )
}

InputWithSave.propTypes = {
  updateSetting: PropTypes.func.isRequired,
  settingName: PropTypes.string.isRequired,
  stateName: PropTypes.string.isRequired,
  saveLabel: PropTypes.string,
  initialValue: PropTypes.string,
  value: PropTypes.string,
  width: PropTypes.string
}

export default connect(null, { updateSetting })(InputWithSave)
