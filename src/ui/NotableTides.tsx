import { useRef, useState } from 'react'
import { useSeed } from '../seed/useSeed'
import { scrollToTop } from '../lib/scroll'
import { staticMode } from '../lib/motion'

// Notable tides (§6b): a short kept list, reachable from the seed tag, plus a
// paste box. It should feel like a list someone keeps, not a feature.
// Names describe what that tide actually is — nothing else.

const NOTABLE: { seed: string; name: string }[] = [
  { seed: '0006-imjr', name: 'night, heavy surf' },
  { seed: '0005-qxkg', name: 'low sun, quiet' },
  { seed: '0003-qffv', name: 'dawn, clear' },
  { seed: '0000-cdv1', name: 'dusk, calm' },
  { seed: '0001-15l5', name: 'overcast, rain' },
  { seed: '0003-9b9v', name: 'haze' },
  { seed: '0008-vijf', name: 'night, rain' },
]

export function NotableTides({ onClose }: { onClose: () => void }) {
  const setSeed = useSeed((s) => s.setSeed)
  const [bad, setBad] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const load = (raw: string) => {
    if (setSeed(raw)) {
      if (!staticMode) scrollToTop()
      onClose()
    } else {
      setBad(true)
      window.setTimeout(() => setBad(false), 1500)
    }
  }

  return (
    <div className="tide-log">
      {NOTABLE.map((t) => (
        <button key={t.seed} type="button" className="tide-log-row" onClick={() => load(t.seed)}>
          <span>{t.name}</span>
          <span className="tide-log-seed">{t.seed}</span>
        </button>
      ))}
      <form
        className="tide-log-paste"
        onSubmit={(e) => {
          e.preventDefault()
          if (input.current) load(input.current.value)
        }}
      >
        <input ref={input} placeholder="paste a seed" aria-label="Load a tide by seed" />
        {bad && <span className="tide-log-bad">not a tide</span>}
      </form>
    </div>
  )
}
