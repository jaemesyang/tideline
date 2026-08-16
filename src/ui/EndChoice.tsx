import { useRef, useState } from 'react'
import { useSeed, shareUrl } from '../seed/useSeed'
import { scrollTideIn } from '../lib/scroll'
import { staticMode } from '../lib/motion'

// The one choice (§6). Two labels, no explanation.

export function EndChoice() {
  const seed = useSeed((s) => s.seed)
  const newTide = useSeed((s) => s.newTide)
  const [saved, setSaved] = useState<string | null>(null)
  const [going, setGoing] = useState(false)
  const timer = useRef<number>(undefined)

  // clipboard writes reject on insecure origins and unfocused documents — an
  // uncaught one left the button silently doing nothing
  const keep = () => {
    const flash = (text: string) => {
      setSaved(text)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setSaved(null), 2400)
    }
    navigator.clipboard.writeText(shareUrl(seed)).then(
      () => flash('Saved.'),
      () => flash('Copy blocked.'),
    )
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
        {saved && <span className="end-saved">{saved}</span>}
      </span>
      <button type="button" onClick={letGo} disabled={going}>
        Let it go
      </button>
    </div>
  )
}
