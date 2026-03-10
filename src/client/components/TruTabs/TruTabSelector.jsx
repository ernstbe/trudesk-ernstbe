/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/22/19 12:29 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { Fragment } from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'

const TruTabSelector = ({ label, active = false, selectorId, showBadge = false, badgeText }) => {
  return (
    <>
      <a
        role='button'
        className={clsx('tru-tab-selector no-ajaxy', active && 'active')}
        data-tabid={selectorId}
        onClick={e => e.preventDefault()}
      >
        {label}
        {showBadge && <span className='uk-badge uk-badge-grey uk-badge-small'>{badgeText}</span>}
      </a>
    </>
  )
}

TruTabSelector.propTypes = {
  label: PropTypes.string.isRequired,
  active: PropTypes.bool,
  selectorId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  showBadge: PropTypes.bool,
  badgeText: PropTypes.oneOfType([PropTypes.string, PropTypes.number])
}

export default TruTabSelector
