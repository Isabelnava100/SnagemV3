import './MentionList.css'

import React, {
  forwardRef, useEffect, useImperativeHandle,
  useState,
} from 'react'

export default forwardRef((props, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  const selectItem = index => {
    const item = props.items[index]

    if (item) {
      // label drives the visible text, id drives the data attribute the
      // server scans when it pings mentioned members.
      props.command({ id: item, label: item })
    }
  }

  const upHandler = () => {
    setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length)
  }

  const downHandler = () => {
    setSelectedIndex((selectedIndex + 1) % props.items.length)
  }

  const enterHandler = () => {
    selectItem(selectedIndex)
  }

  useEffect(() => setSelectedIndex(0), [props.items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (event.key === 'ArrowUp') {
        upHandler()
        return true
      }

      if (event.key === 'ArrowDown') {
        downHandler()
        return true
      }

      if (event.key === 'Enter') {
        enterHandler()
        return true
      }

      return false
    },
  }))

  return (
    // mousedown + preventDefault keeps the editor's selection alive: a plain
    // click lets the contentEditable blur first, the suggestion plugin treats
    // it as an outside click and dismisses the dropdown BEFORE onClick can
    // run, which is why picking a name did nothing.
    <div className="items" onMouseDown={(e) => e.preventDefault()}>
      {props.items.length
        ? props.items.map((item, index) => (
          <button
            type="button"
            className={`item ${index === selectedIndex ? 'is-selected' : ''}`}
            key={index}
            onClick={() => selectItem(index)}
          >
            {item}
          </button>
        ))
        : <div className="item">No result</div>
      }
    </div>
  )
})