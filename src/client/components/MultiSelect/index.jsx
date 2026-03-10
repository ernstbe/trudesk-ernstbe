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
 *  Updated:    2/24/19 2:05 AM
 *  Copyright (c) 2014-2019. All rights reserved.
 */

import React, { useRef, useEffect, useCallback, useImperativeHandle } from 'react'
import PropTypes from 'prop-types'
import { each } from 'lodash'

import $ from 'jquery'
import helpers from 'lib/helpers'

const MultiSelect = ({
  id,
  items,
  initialSelected,
  onChange,
  disabled,
  ref
}) => {
  const selectRef = useRef(null)
  const prevItemsRef = useRef(items)
  const prevInitialSelectedRef = useRef(initialSelected)

  useEffect(() => {
    const $select = $(selectRef.current)
    helpers.UI.multiSelect({
      afterSelect: onChange,
      afterDeselect: onChange
    })

    if (initialSelected) {
      $select.multiSelect('select', initialSelected)
      $select.multiSelect('refresh')
    }

    if (disabled) {
      $select.attr('disabled', 'disabled')
      $select.multiSelect('refresh')
    }
  }, [])

  useEffect(() => {
    const prevItems = prevItemsRef.current
    const prevInitialSelected = prevInitialSelectedRef.current
    prevItemsRef.current = items
    prevInitialSelectedRef.current = initialSelected

    const $select = $(selectRef.current)
    if (!helpers.arrayIsEqual(prevItems, items)) {
      $select.empty().multiSelect('refresh')
      each(items, i => {
        $select.append(`<option value='${i.value}'>${i.text}</option>`)
      })

      $select.attr('disabled', false)
      $select.multiSelect('refresh')

      if (initialSelected) {
        $select.multiSelect('select', initialSelected)
        $select.multiSelect('refresh')
      }
    } else {
      if (prevInitialSelected !== initialSelected) {
        $select.multiSelect('select', initialSelected)
        $select.multiSelect('refresh')
      }
    }

    $select.attr('disabled', disabled)
    $select.multiSelect('refresh')
  }, [items, initialSelected, disabled])

  const getSelected = useCallback(() => {
    const $select = $(selectRef.current)
    if (!$select) return []
    return $select.val()
  }, [])

  const selectAll = useCallback(() => {
    const $select = $(selectRef.current)
    if ($select) {
      if (items && items.length > 0) {
        $select.multiSelect('select_all')
        $select.multiSelect('refresh')
      }
    }
  }, [items])

  const deselectAll = useCallback(() => {
    const $select = $(selectRef.current)
    if ($select) {
      if (items && items.length > 0) {
        $select.multiSelect('deselect_all')
        $select.multiSelect('refresh')
      }
    }
  }, [items])

  useImperativeHandle(ref, () => ({
    getSelected,
    selectAll,
    deselectAll
  }), [getSelected, selectAll, deselectAll])

  return (
    <select id={id} multiple='multiple' className='multiselect' ref={selectRef}>
      {items &&
        items.map((item, i) => {
          return (
            <option key={i} value={item.value}>
              {item.text}
            </option>
          )
        })}
    </select>
  )
}

MultiSelect.displayName = 'MultiSelect'

MultiSelect.propTypes = {
  id: PropTypes.string,
  items: PropTypes.array.isRequired,
  initialSelected: PropTypes.array,
  onChange: PropTypes.func.isRequired,
  disabled: PropTypes.bool
}

export default MultiSelect
