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
 *  Updated:    7/6/22 1:42 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useRef, useCallback } from 'react'
import PropTypes from 'prop-types'

const PDropdownTrigger = ({ target, children }) => {
  const containerRef = useRef(null)

  const onTargetClick = useCallback(e => {
    e.preventDefault()
    if (target && target.current && typeof target.current.show === 'function') {
      target.current.show(containerRef.current)
    }
  }, [target])

  return (
    <div ref={containerRef} className='uk-clearfix' onClick={onTargetClick}>
      {children}
    </div>
  )
}

PDropdownTrigger.propTypes = {
  target: PropTypes.any.isRequired,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired
}

export default PDropdownTrigger
