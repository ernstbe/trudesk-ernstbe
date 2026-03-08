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
 *  Updated:    4/3/19 12:51 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useEffect, useRef } from 'react'
import PropTypes from 'prop-types'

import $ from 'jquery'

function formatNumber (num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function calcStartEnd (page, limit) {
  page = Number(page)
  limit = Number(limit)
  const start = page === 0 ? '1' : page * limit
  const end = page === 0 ? limit : page * limit + limit

  return { start, end }
}

const TitlePagination = ({ limit = 50, total, prevEnabled, nextEnabled, currentPage, prevPage = 0, nextPage = 1, type, filter }) => {
  const parentRef = useRef(null)

  useEffect(() => {
    $(parentRef.current).ajaxify()
  })

  const link = page => {
    if (!type) return '#'
    if (type.toLowerCase() === 'filter') {
      return `${filter.raw}&page=${page}`
    } else {
      return `/tickets/${type}/page/${page}/`
    }
  }

  const startEnd = calcStartEnd(currentPage, limit)

  return (
    <div className='pagination uk-float-left uk-clearfix' ref={parentRef}>
      <span className='pagination-info'>
        {formatNumber(startEnd.start)} - {formatNumber(startEnd.end)} of{' '}
        {formatNumber(total)}
      </span>
      <ul className='button-group'>
        <li className='pagination'>
          <a
            href={prevEnabled ? link(prevPage) : '#'}
            title='Previous Page'
            className={'btn md-btn-wave-light' + (!prevEnabled ? ' no-ajaxy' : '')}
          >
            <i className='fa fa-large fa-chevron-left' />
          </a>
        </li>
        <li className='pagination'>
          <a
            href={nextEnabled ? link(nextPage) : '#'}
            title='Next Page'
            className={'btn md-btn-wave-light' + (!nextEnabled ? ' no-ajaxy' : '')}
          >
            <i className='fa fa-large fa-chevron-right' />
          </a>
        </li>
      </ul>
    </div>
  )
}

TitlePagination.propTypes = {
  limit: PropTypes.number,
  total: PropTypes.string,
  type: PropTypes.string,
  filter: PropTypes.object,
  prevEnabled: PropTypes.bool.isRequired,
  nextEnabled: PropTypes.bool.isRequired,
  currentPage: PropTypes.string,
  prevPage: PropTypes.number,
  nextPage: PropTypes.number
}

export default TitlePagination
