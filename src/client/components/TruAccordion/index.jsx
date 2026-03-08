import React, { useState, useEffect, useRef, useCallback } from 'react'
import PropTypes from 'prop-types'
import clsx from 'clsx'

const TruAccordion = ({ startExpanded = false, onExpandedChange, contentPadding, headerContent, content }) => {
  const [expanded, setExpanded] = useState(false)
  const [expandedContentShown, setExpandedContentShown] = useState(false)
  const expandedRef = useRef(false)

  useEffect(() => {
    setExpanded(startExpanded)
    setExpandedContentShown(startExpanded)
    expandedRef.current = startExpanded
  }, [])

  const onHeaderClick = useCallback(
    e => {
      e.preventDefault()

      // If currently collapsed, show content container immediately (before expand animation)
      if (expandedRef.current === false) setExpandedContentShown(true)

      // Fire onExpandedChange with the current (pre-toggle) value, matching original behavior
      if (onExpandedChange) onExpandedChange(expandedRef.current)

      // Toggle expanded state after 10ms delay (for animation)
      setTimeout(() => {
        const next = !expandedRef.current
        expandedRef.current = next
        setExpanded(next)
      }, 10)

      // After 300ms (animation complete), sync content visibility with expanded state
      setTimeout(() => {
        setExpandedContentShown(expandedRef.current)
      }, 300)
    },
    [onExpandedChange]
  )

  const contentStyle = {}
  if (typeof contentPadding !== 'undefined') contentStyle.padding = contentPadding

  return (
    <div className={clsx('truaccordion-wrapper', expanded && ' expanded')}>
      <div className='truaccordion-header' role='button' onClick={onHeaderClick}>
        <div className='truaccordion-header-content'>
          <h4>{headerContent}</h4>
          <div className='arrow'>
            <span>
              <i className='material-icons'>chevron_right</i>
            </span>
          </div>
        </div>
      </div>
      {expandedContentShown && (
        <div className='truaccordion-content'>
          <div className='truaccordion-content-inner' style={contentStyle}>
            {content}
          </div>
        </div>
      )}
    </div>
  )
}

TruAccordion.propTypes = {
  startExpanded: PropTypes.bool,
  onExpandedChange: PropTypes.func,
  contentPadding: PropTypes.number,

  headerContent: PropTypes.string.isRequired,
  content: PropTypes.node.isRequired
}

export default TruAccordion
