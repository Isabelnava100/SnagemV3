import { ReactRenderer } from '@tiptap/react'
import tippy from 'tippy.js'
import MentionList from './MentionList'

// Real member usernames for the @mention dropdown (replaces the Tiptap demo
// placeholder list). Fetched once per session and cached module-level.
let cachedUsernames = null
let loading = null

async function loadUsernames() {
  if (cachedUsernames) return cachedUsernames
  if (!loading) {
    loading = import('../../queries/admin')
      .then(({ getUsers }) => getUsers())
      .then((users) => {
        cachedUsernames = users.map((u) => u.username).filter(Boolean).sort()
        return cachedUsernames
      })
      .catch(() => {
        cachedUsernames = []
        return cachedUsernames
      })
  }
  return loading
}

export default {
  items: async ({ query }) => {
    const usernames = await loadUsernames()
    return usernames
      .filter((item) => item.toLowerCase().startsWith(query.toLowerCase()))
      .slice(0, 5)
  },

  render: () => {
    let component
    let popup

    return {
      onStart: props => {
        component = new ReactRenderer(MentionList, {
          props,
          editor: props.editor,
        })

        if (!props.clientRect) {
          return
        }

        popup = tippy('body', {
          getReferenceClientRect: props.clientRect,
          appendTo: () => document.body,
          content: component.element,
          showOnCreate: true,
          interactive: true,
          trigger: 'manual',
          placement: 'bottom-start',
        })
      },

      onUpdate(props) {
        component.updateProps(props)

        if (!props.clientRect) {
          return
        }

        popup[0].setProps({
          getReferenceClientRect: props.clientRect,
        })
      },

      onKeyDown(props) {
        if (props.event.key === 'Escape') {
          popup[0].hide()

          return true
        }

        return component.ref?.onKeyDown(props)
      },

      onExit() {
        popup[0].destroy()
        component.destroy()
      },
    }
  },
}
