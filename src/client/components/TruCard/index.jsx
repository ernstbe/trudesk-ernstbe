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
 *  Updated:    2/22/19 11:19 PM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React from 'react'
import PropTypes from 'prop-types'
import DropdownTrigger from 'components/Dropdown/DropdownTrigger'
import Dropdown from 'components/Dropdown'
import SpinLoader from 'components/SpinLoader'
import clsx from 'clsx'

const TruCard = ({
  menu,
  header,
  extraHeadClass,
  extraContentClass,
  content,
  loaderActive = false,
  hover = true,
  fullSize = true,
  showMoveHandle = false,
  style,
  animateLoader = false,
  animateDelay = 600
}) => {
  return (
    <div
      className={clsx(
        'tru-card-wrapper',
        'uk-position-relative',
        fullSize && 'uk-width-1-1 uk-height-1-1'
      )}
      style={style}
    >
      <SpinLoader
        animate={animateLoader}
        animateDelay={animateDelay}
        active={loaderActive}
      />
      <div
        className={clsx(
          'tru-card',
          hover && 'tru-card-hover',
          fullSize && 'uk-width-1-1 uk-height-1-1'
        )}
      >
        {showMoveHandle && (
          <div style={{ cursor: 'move', position: 'absolute', top: 2, right: 8 }}>
            <i className='material-icons'>drag_handle</i>
          </div>
        )}
        {header && (
          <div className={'tru-card-head ' + (extraHeadClass || '')}>
            {menu && (
              <div className='tru-card-head-menu'>
                <DropdownTrigger pos='bottom-right' mode='click'>
                  <i className='material-icons tru-icon'>more_vert</i>
                  <Dropdown small>
                    {menu.map(child => {
                      return child
                    })}
                  </Dropdown>
                </DropdownTrigger>
              </div>
            )}
            {/* HEADER TEXT */}
            {header && <div className='uk-text-center'>{header}</div>}
          </div>
        )}
        {/* Tru Card Content */}
        <div className={'tru-card-content uk-clearfix ' + (extraContentClass || '')}>
          {content}
        </div>
      </div>
    </div>
  )
}

TruCard.propTypes = {
  menu: PropTypes.arrayOf(PropTypes.element),
  header: PropTypes.element,
  extraHeadClass: PropTypes.string,
  extraContentClass: PropTypes.string,
  content: PropTypes.element.isRequired,
  loaderActive: PropTypes.bool,
  hover: PropTypes.bool,
  fullSize: PropTypes.bool,
  showMoveHandle: PropTypes.bool,
  style: PropTypes.object,
  animateLoader: PropTypes.bool,
  animateDelay: PropTypes.number
}

export default TruCard
