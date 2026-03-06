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

import React, { useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

import $ from 'jquery'
import UIkit from 'uikit'

const Menu = ({ hideBorders, children, draggable = false, onMenuDrag }) => {
  const menuRef = useRef(null)
  const menuSortableRef = useRef(null)

  useEffect(() => {
    if (draggable && !menuSortableRef.current && menuRef.current) {
      const menu = $(menuRef.current)
      menuSortableRef.current = UIkit.sortable(menu, {
        handleClass: 'drag-handle'
      })

      if (onMenuDrag) menuSortableRef.current.on('change.uk.sortable', onMenuDrag)
    }
  })

  return (
    <ul
      ref={menuRef}
      className={'settings-categories scrollable' + (hideBorders ? ' noborder ' : '')}
      style={{ overflow: 'hidden auto' }}
    >
      {children}
    </ul>
  )
}

Menu.propTypes = {
  hideBorders: PropTypes.bool,
  children: PropTypes.oneOfType([PropTypes.arrayOf(PropTypes.node), PropTypes.node]).isRequired,
  draggable: PropTypes.bool,
  onMenuDrag: PropTypes.func
}

export default Menu
