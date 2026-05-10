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

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react'
import PropTypes from 'prop-types'
import $ from 'jquery'
import helpers from 'lib/helpers'

function getRandomColor () {
  const letters = '0123456789ABCDEF'
  let color = '#'
  for (let i = 0; i < 6; i++) color += letters[Math.floor(Math.random() * 16)]

  return color
}

function getContrast (hexcolor) {
  hexcolor = hexcolor.replace('#', '')
  if (hexcolor.length === 3) {
    const v = hexcolor[0]
    hexcolor = hexcolor + v + v + v
  }
  const r = parseInt(hexcolor.substr(0, 2), 16)
  const g = parseInt(hexcolor.substr(2, 2), 16)
  const b = parseInt(hexcolor.substr(4, 2), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 128 ? '#444' : '#f7f8fa'
}

const ColorSelector = forwardRef(({
  inputName,
  defaultColor = '#878982',
  showLabel = true,
  hideRevert = false,
  parentClass,
  onChange,
  validationEnabled = false
}, ref) => {
  const [selectedColor, setSelectedColor] = useState('')
  const colorButtonRef = useRef(null)

  const updateColorButton = useCallback((color) => {
    if (colorButtonRef.current && color) {
      const fgColor = getContrast(color.substring(1))
      $(colorButtonRef.current).css({ background: color, color: fgColor })
    }
  }, [])

  // Settings/Appearance still calls the legacy class API on this ref:
  //   ref.current.setState({ selectedColor: ... }, ref.current.updateColorButton)
  //   ref.current.state.selectedColor
  // After the class-to-hooks migration those properties were lost, so the
  // built-in colour-scheme dropdown silently failed. Expose a minimal shim
  // via useImperativeHandle so the existing parent keeps working.
  useImperativeHandle(ref, () => ({
    get state () {
      return { selectedColor }
    },
    setState (update /* the parent's second-arg callback is intentionally ignored */) {
      if (update && update.selectedColor !== undefined) {
        setSelectedColor(update.selectedColor)
        // Drive the colour-button visual update directly with the new value;
        // we cannot rely on the parent's callback because its closure still
        // sees the old selectedColor.
        updateColorButton(update.selectedColor)
      }
    },
    updateColorButton: () => updateColorButton(selectedColor)
  }), [selectedColor, updateColorButton])

  useEffect(() => {
    helpers.UI.inputs()
    setSelectedColor(defaultColor)
    updateColorButton(defaultColor)
  }, [])

  useEffect(() => {
    setSelectedColor(defaultColor)
    updateColorButton(defaultColor)
  }, [defaultColor, updateColorButton])

  const generateRandomColor = useCallback(event => {
    event.preventDefault()
    const $currentTarget = $(event.target)
    if ($currentTarget.length > 0) {
      const color = getRandomColor()
      if (onChange) {
        event.target.value = color
        onChange(event)
      }
      setSelectedColor(color)
      updateColorButton(color)
    }
  }, [onChange, updateColorButton])

  const onInputValueChange = useCallback(e => {
    const val = e.target.value
    if (onChange) onChange(e)

    setSelectedColor(val)
    updateColorButton(val)
  }, [onChange, updateColorButton])

  const revertColor = useCallback(() => {
    setSelectedColor(defaultColor)
    updateColorButton(defaultColor)
  }, [defaultColor, updateColorButton])

  return (
    <div
      className={parentClass}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}
    >
      <div style={{ display: 'flex', width: '100%' }}>
        <button
          ref={colorButtonRef}
          className='uk-button uk-button-small uk-color-button mr-15 mt-10'
          style={{ width: 37, height: 37 }}
          onClick={generateRandomColor}
        >
          <i className='material-icons'>refresh</i>
        </button>
        <div className='md-input-wrapper md-input-filled' style={{ width: '100%' }}>
          {showLabel && <label>Color</label>}
          {validationEnabled && (
            <input
              name={inputName || ''}
              type='text'
              className='md-input'
              value={selectedColor}
              onChange={onInputValueChange}
              data-validation='custom'
              data-validation-regexp='^\#([0-9a-fA-F]){3,6}$'
              data-validation-error-msg='Invalid HEX Color'
            />
          )}
          {!validationEnabled && (
            <input
              name={inputName || ''}
              type='text'
              className='md-input'
              value={selectedColor}
              onChange={onInputValueChange}
            />
          )}
          <div className='md-input-bar' />
        </div>
      </div>
      {!hideRevert && (
        <button
          type='button'
          className='md-btn md-btn-small md-btn-flat ml-10 mt-10'
          onClick={revertColor}
        >
          Revert
        </button>
      )}
    </div>
  )
})

ColorSelector.displayName = 'ColorSelector'

ColorSelector.propTypes = {
  inputName: PropTypes.string,
  defaultColor: PropTypes.string.isRequired,
  showLabel: PropTypes.bool,
  hideRevert: PropTypes.bool,
  parentClass: PropTypes.string,
  onChange: PropTypes.func,
  validationEnabled: PropTypes.bool
}

export default ColorSelector
