import React from 'react'
import PropTypes from 'prop-types'

const Spacer = ({ top = 15, bottom = 15, showBorder = false, borderSize = 2 }) => {
  return (
    <div style={{ display: 'block', marginTop: top, marginBottom: bottom }}>
      {showBorder && <hr style={{ display: 'block', margin: 0, height: borderSize }} />}
    </div>
  )
}

Spacer.propTypes = {
  top: PropTypes.number,
  bottom: PropTypes.number,
  showBorder: PropTypes.bool,
  // borderColor: PropTypes.string,
  borderSize: PropTypes.number
}

export default Spacer
