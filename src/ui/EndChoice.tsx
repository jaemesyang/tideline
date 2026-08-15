import { useRef, useState } from 'react'
import { useSeed } from '../seed/useSeed'
import { scrollTideIn } from '../lib/scroll'
import { staticMode } from '../lib/motion'

// The one choice (§6). Two labels, no explanation.

export function EndChoice() {
  const newTide = useSeed((s) => s.newTide)
  const [saved, setSaved] = useState(false)
  const [going, setGoing] = useState(false)
  const timer = useRef<number>(undefined)

  const keep = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setSaved(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setSaved(false), 2000)
    })
  }

  const letGo = () => {
    if (going) return
    if (staticMode) {
      newTide()
      window.scrollTo(0, 0)
      return
    }
    setGoing(true)
    scrollTideIn(() => {
      newTide()
      setGoing(false)
    })
  }

  return (
    <div className="end-choice">
      <span className="end-keep">
        <button type="button" onClick={keep}>
          Keep this tide
        </button>
        {saved && <span className="end-saved">Saved.</span>}
      </span>
      <button type="button" onClick={letGo} disabled={going}>
        Let it go
      </button>
    </div>
  )
}
