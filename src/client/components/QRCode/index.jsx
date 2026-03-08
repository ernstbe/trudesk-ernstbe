import React, { useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

import $ from 'jquery'
import 'qrcode'

const QRCode = ({
  code,
  size = 240,
  css
}) => {
  const qrcodeDiv = useRef(null)

  useEffect(() => {
    if (qrcodeDiv.current) {
      const $div = $(qrcodeDiv.current)
      $div.qrcode({ width: size, height: size, text: code })
    }
  }, [code, size])

  let cssStyle = {}
  if (css) cssStyle = css
  return (
    <div style={cssStyle}>
      <div ref={qrcodeDiv} />
    </div>
  )
}

QRCode.propTypes = {
  code: PropTypes.string.isRequired,
  size: PropTypes.number,
  css: PropTypes.object
}

export default QRCode
