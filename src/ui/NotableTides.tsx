import { useMemo, useRef, useState } from 'react'
import { useSeed } from '../seed/useSeed'
import { deriveWorld } from '../seed/deriveWorld'
import { scrollToTop } from '../lib/scroll'
import { staticMode } from '../lib/motion'

// Notable tides (§6b): a short kept list, reachable from the seed tag, plus a
// paste box. It should feel like a list someone keeps, not a feature.
//
// What each tide IS comes from deriveWorld, never from a hand-typed string.
// The names used to be written out, and adding `snow` re-rolled every tide's
// weather and silently made all seven of them lie. Only the human aside — the
// part a derivation can't know — is authored here.

const NOTABLE: { seed: string; note?: string }[] = [
  { seed: '0002-u05m', note: 'heavy surf' },
  { seed: '0005-qxkg', note: 'low sun, quiet' },
  { seed: '0009-fjyl' },
  { seed: '0000-cdv1', note: 'calm' },
  { seed: '0001-15l5' },
  { seed: '0006-imjr' },
  { seed: '0009-08uc', note: 'low sun' },
]

export function NotableTides({ onClose }: { onClose: () => void }) {
  const setSeed = useSeed((s) => s.setSeed)
  const newTide = useSeed((s) => s.newTide)
  const current = useSeed((s) => s.seed)
  const [bad, setBad] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const rows = useMemo(
    () =>
      NOTABLE.map(({ seed, note }) => {
        const w = deriveWorld(seed)
        return { seed, note, what: `${w.timeOfDay} · ${w.weather}` }
      }),
    [],
  )

  const done = () => {
    if (!staticMode) scrollToTop()
    onClose()
  }

  const load = (raw: string) => {
    if (setSeed(raw)) {
      done()
    } else {
      setBad(true)
      window.setTimeout(() => setBad(false), 1500)
    }
  }

  return (
    <div className="tide-log">
      <div className="tide-log-head">
        <span>kept tides</span>
        <span>{rows.length}</span>
      </div>
      {rows.map((t) => {
        const here = t.seed === current
        return (
          <button
            key={t.seed}
            type="button"
            className="tide-log-row"
            aria-current={here || undefined}
            onClick={() => load(t.seed)}
          >
            <span className="tide-log-what">{t.what}</span>
            <span className="tide-log-note">{here ? 'you are here' : (t.note ?? '')}</span>
            <span className="tide-log-seed">{t.seed}</span>
          </button>
        )
      })}
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
      <button
        type="button"
        className="tide-log-draw"
        onClick={() => {
          newTide()
          done()
        }}
      >
        draw a new tide
      </button>
    </div>
  )
}
