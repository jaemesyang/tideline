import { useEffect, useState } from 'react'
import { startAutoTide, stopAutoTide } from '../lib/scroll'
import { staticMode } from '../lib/motion'

// Auto mode: the tide goes out by itself and comes to rest at the résumé.
// The spec's "the visitor mostly watches", made literal — opt-in, and any
// scroll input takes it back (see startAutoTide).

export function AutoTide() {
  const [on, setOn] = useState(false)

  useEffect(() => () => stopAutoTide(), [])

  if (staticMode) return null // nothing to run: the tide is already out

  const toggle = () => {
    if (on) {
      stopAutoTide()
      setOn(false)
    } else {
      setOn(true)
      startAutoTide(() => setOn(false))
    }
  }

  return (
    <button type="button" className="auto-toggle" aria-pressed={on} onClick={toggle}>
      auto: {on ? 'on' : 'off'}
    </button>
  )
}
