/*
 *       .                             .o8                     oooo
 *    .o8                             "888                     `888
 *  .o888oo oooo d8b oooo  oooo   .oooo888   .ooooo.   .oooo.o  888  oooo
 *    888   `888""8P `888  `888  d88' `888  d88' `88b d88(  "8  888 .8P'
 *    888    888      888   888  888   888  888ooo888 `"Y88b.   888888.
 *    888 .  888      888   888  888   888  888    .o o.  )88b  888 `88b.
 *    "888" d888b     `V88V"V8P' `Y8bod88P" `Y8bod8P' 8""888P' o888o o888o
 *  ========================================================================
 *  Updated:    6/23/19 5:52 PM
 *  Copyright (c) 2014-2019 Trudesk, Inc. All rights reserved.
 */

import React, { Fragment, useRef, useEffect } from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'

import $ from 'jquery'
import helpers from 'lib/helpers'

const DatePicker = ({
  format,
  name,
  onChange,
  value,
  small = false,
  validation = 'shortDate',
  readOnly = true
}) => {
  const datepickerRef = useRef(null)

  useEffect(() => {
    const node = datepickerRef.current
    $(node).on('change.uk.datepicker', e => {
      if (onChange) onChange(e)
    })

    return () => {
      $(node).off('change.uk.datepicker')
    }
  }, [onChange])

  useEffect(() => {
    if (value) $(datepickerRef.current).val(helpers.formatDate(value, format))
    if (value === undefined) $(datepickerRef.current).val('')
  }, [value, format])

  return (
    <>
      <input
        ref={datepickerRef}
        id={name}
        name={name}
        type='text'
        readOnly
        className={clsx('md-input', small && 'small-font', small && 'p-0')}
        data-uk-datepicker={`{format:'${format}'}`}
        data-validation={validation}
        style={{ width: '97%' }}
        defaultValue={value ? helpers.formatDate(value, format) : ''}
      />
    </>
  )
}

DatePicker.propTypes = {
  format: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  onChange: PropTypes.func,
  value: PropTypes.string,
  small: PropTypes.bool,
  validation: PropTypes.string,
  readOnly: PropTypes.bool
}

export default DatePicker
