import React, { useState, useEffect, useCallback } from 'react'
import PropTypes from 'prop-types'

import helpers from 'lib/helpers'

const Input = ({
  name,
  type = 'text',
  defaultValue,
  onChange
}) => {
  const [, setValue] = useState('')

  useEffect(() => {
    helpers.UI.inputs()
  }, [])

  const handleChange = useCallback(e => {
    const newValue = e.target.value
    setValue(newValue)
    if (onChange) onChange(newValue)
  }, [onChange])

  return (
    <div>
      <input
        className='md-input'
        name={name}
        type={type}
        defaultValue={defaultValue}
        onChange={handleChange}
      />
    </div>
  )
}

Input.propTypes = {
  name: PropTypes.string,
  type: PropTypes.string,
  defaultValue: PropTypes.string,
  onChange: PropTypes.func
}

export default Input
