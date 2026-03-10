import React, { useRef, useEffect } from 'react'
import PropTypes from 'prop-types'

import CountUpJS from 'countup'

export default function CountUp ({ startNumber = 0, endNumber = 0, extraText, duration = 1.5 }) {
  const textRef = useRef(null)
  let animation = useRef(null)

  // useTrudeskReady(() => {
  //   if (textRef.current) {
  //     textRef.current.innerText = '--'
  //     animation = new CountUpJS(textRef.current, props.startNumber, props.endNumber, 0, props.duration)
  //     setTimeout(() => {
  //       animation.start()
  //     }, 500)
  //   }
  // })

  useEffect(() => {
    if (textRef.current) {
      textRef.current.innerText = '--'
      animation = new CountUpJS(textRef.current, startNumber, endNumber, 0, duration)
      animation.start()
    }
  }, [startNumber, endNumber])

  return (
    <div>
      <span ref={textRef}>--</span>
      {extraText && ` ${extraText}`}
    </div>
  )
}

CountUp.propTypes = {
  startNumber: PropTypes.number,
  endNumber: PropTypes.number,
  extraText: PropTypes.string,
  duration: PropTypes.number
}
