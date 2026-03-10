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
 *  Updated:    2/10/19 2:57 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

import UIkit from 'uikit'

const DropdownTrigger = ({
  mode = 'click',
  pos = 'bottom-left',
  offset,
  extraClass,
  children
}) => {
  const dropRef = useRef(null)

  useEffect(() => {
    if (dropRef.current) {
      UIkit.dropdown(dropRef.current, {
        mode,
        pos,
        offset
      })
    }

    return () => {
      // cleanup
    }
  }, [mode, pos, offset])

  return (
    <div
      ref={dropRef}
      className={'uk-position-relative' + (extraClass ? ' ' + extraClass : '')}
      aria-haspopup
      aria-expanded={false}
    >
      {children}
    </div>
  )
}

DropdownTrigger.propTypes = {
  mode: PropTypes.string,
  pos: PropTypes.string,
  offset: PropTypes.number,
  extraClass: PropTypes.string,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired
}

export default DropdownTrigger
