import { useEffect, useRef, useState } from 'react'
import { useSeed, shareUrl } from '../seed/useSeed'
import { NotableTides } from './NotableTides'

// The tide-log entry (§1): always visible, mono, click copies the shareable
// seeded URL. `log` opens the notable-tides list (§6b) beside it.
//
// `what is this?` used to live here; it moved to the middle of the frame under
// the title (ui/AboutTour.tsx), where a first-time visitor actually looks.

export function SeedTag() {
  const seed = useSeed((s) => s.seed)
  const [copied, setCopied] = useState<string | null>(null)
  const [logOpen, setLogOpen] = useState(false)
  const timer = useRef<number>(undefined)
  const wrap = useRef<HTMLDivElement>(null)

  // The clipboard API rejects on an insecure origin, in some embeds, and when
  // the document isn't focused. Without a catch that surfaced as an unhandled
  // rejection and a tag that looked broken; say so instead.
  const copy = () => {
    const flash = (text: string) => {
      setCopied(text)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(null), 1800)
    }
    navigator.clipboard.writeText(shareUrl(seed)).then(
      () => flash('copied'),
      () => flash('copy blocked'),
    )
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
      </button>
      <button
        type="button"
        className="seed-log-toggle"
        aria-expanded={logOpen}
        onClick={() => setLogOpen((o) => !o)}
      >
        log
      </button>
      {copied && (
        <span className="copied" aria-live="polite">
          {copied}
        </span>
      )}
      {logOpen && <NotableTides onClose={() => setLogOpen(false)} />}
    </div>
  )
}
