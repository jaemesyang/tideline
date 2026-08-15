import { useEffect, useRef, useState } from 'react'
import { useSeed } from '../seed/useSeed'
import { NotableTides } from './NotableTides'

// The tide-log entry (§1): always visible, mono, click copies the shareable
// seeded URL. `log` opens the notable-tides list (§6b).

export function SeedTag() {
  const seed = useSeed((s) => s.seed)
  const [copied, setCopied] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const timer = useRef<number>(undefined)
  const wrap = useRef<HTMLDivElement>(null)

  const copy = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1400)
    })
  }

  useEffect(() => {
    if (!logOpen) return
    const close = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setLogOpen(false)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLogOpen(false)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [logOpen])

  return (
    <div className="seed-wrap" ref={wrap}>
      <button type="button" className="seed-tag" onClick={copy} title="Copy a link to this tide">
        tide {seed}
        {copied && <span className="copied">copied</span>}
      </button>
      <button
        type="button"
        className="seed-log-toggle"
        aria-expanded={logOpen}
        onClick={() => setLogOpen((v) => !v)}
      >
        log
      </button>
      {logOpen && <NotableTides onClose={() => setLogOpen(false)} />}
    </div>
  )
}
