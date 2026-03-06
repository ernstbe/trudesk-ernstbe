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

import React, { useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import { merge } from 'lodash'
import clsx from 'clsx'

const EnableSwitch = ({ stateName, label, labelStyle, sublabel, style, leverClass, onChange, checked, disabled }) => {
  const labelRef = useRef(null)

  const onLevelClick = useCallback((e) => {
    e.preventDefault()
    if (labelRef.current) {
      labelRef.current.click()
    }
  }, [])

  const combinedStyle = merge({ margin: '17px 0 0 0' }, style)
  return (
    <div className='md-switch-wrapper md-switch md-green uk-float-right uk-clearfix' style={combinedStyle}>
      <label ref={labelRef} htmlFor={stateName} style={labelStyle || {}}>
        {label}
        {sublabel}
      </label>

      <input
        type='checkbox'
        id={stateName}
        name={stateName}
        onChange={onChange}
        checked={checked}
        disabled={disabled}
      />
      <span className={clsx('lever', leverClass)} onClick={onLevelClick} />
    </div>
  )
}

EnableSwitch.propTypes = {
  stateName: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  labelStyle: PropTypes.object,
  sublabel: PropTypes.node,
  style: PropTypes.object,
  leverClass: PropTypes.string,
  onChange: PropTypes.func,
  checked: PropTypes.oneOfType([PropTypes.string, PropTypes.bool]),
  disabled: PropTypes.oneOfType([PropTypes.string, PropTypes.bool])
}

export default EnableSwitch
