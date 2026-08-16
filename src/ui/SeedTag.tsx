import { useEffect, useRef, useState } from 'react'
import { useSeed, shareUrl } from '../seed/useSeed'
import { NotableTides } from './NotableTides'
import { WhatIsThis } from './WhatIsThis'

// The tide-log entry (§1): always visible, mono, click copies the shareable
// seeded URL. `log` opens the notable-tides list (§6b); `what is this?` opens
// the explainer. One panel at a time.

type Panel = 'log' | 'about' | null

export function SeedTag() {
  const seed = useSeed((s) => s.seed)
  const [copied, setCopied] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>(null)
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

  const toggle = (which: Exclude<Panel, null>) => setPanel((p) => (p === which ? null : which))

  useEffect(() => {
    if (!panel) return
    const close = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setPanel(null)
    }
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanel(null)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', esc)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', esc)
    }
  }, [panel])

  return (
    <div className="seed-wrap" ref={wrap}>
      <button type="button" className="seed-tag" onClick={copy} title="Copy a link to this tide">
        tide {seed}
      </button>
      <button
        type="button"
        className="seed-log-toggle"
        aria-expanded={panel === 'log'}
        onClick={() => toggle('log')}
      >
        log
      </button>
      <button
        type="button"
        className="seed-log-toggle"
        aria-expanded={panel === 'about'}
        onClick={() => toggle('about')}
      >
        what is this?
      </button>
      {copied && (
        <span className="copied" aria-live="polite">
          {copied}
        </span>
      )}
      {panel === 'log' && <NotableTides onClose={() => setPanel(null)} />}
      {panel === 'about' && <WhatIsThis />}
    </div>
  )
}
