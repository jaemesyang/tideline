import { useEffect, useLayoutEffect, useRef, useState, type FocusEvent } from 'react'
import { createPortal } from 'react-dom'
import { staticMode } from '../lib/motion'
import { releaseNudge } from '../lib/scroll'

// The explainer, walked rather than read. It rings each control in turn and
// says what it does, advancing on its own so a visitor can just watch.
//
// Register is the same as everywhere else: dry, factual, and it says that some
// tides carry more without ever naming what — the eggs stay unannounced.

type Step = {
  /** Chrome this step is about. Omitted = a centred card about the scene. */
  target?: string
  title: string
  body: string
}

const STEPS: Step[] = [
  {
    title: 'A beach, drawn from a seed',
    body: 'The seed sets the hour, the weather, and what the tide carries in. No two visits open on the same beach.',
  },
  {
    target: '.seed-tag',
    title: 'This tide',
    body: 'Click the seed to copy a link that rebuilds this exact beach. Reload without one and it is gone.',
  },
  {
    target: '.seed-log-toggle',
    title: 'log',
    body: 'A few tides worth keeping, and a box to paste a seed into.',
  },
  {
    title: 'The objects are the work',
    body: 'Everything the water uncovers carries a label. Open one with + detail.',
  },
  {
    target: '.auto-toggle',
    title: 'auto',
    body: 'Runs the tide out on its own, all the way to the résumé. Any scroll hands it straight back.',
  },
  {
    target: '.audio-toggle',
    title: 'sound',
    body: 'The sea, seeded like the rest. Every crash is a wave you can watch break.',
  },
  {
    target: '.resume-jump',
    title: 'résumé →',
    body: 'Skips the tide entirely and goes to the full text.',
  },
  {
    title: 'Some tides carry more',
    body: 'A few tides bring things most do not. Nothing lists them, and one or two are rare enough you may never meet one.',
  },
  {
    title: 'Start scrolling',
    body: 'Scrolling is the tide going out. What it uncovers is the work.',
  },
]

const CARD_W = 312
const EDGE = 12
const GAP = 14

/** How long a step holds before it advances — long enough to read it once,
 *  short enough that the whole tour is well under a minute. */
function dwellMs(step: Step): number {
  const words = (step.title + ' ' + step.body).split(/\s+/).length
  return Math.min(Math.max(1800 + words * 110, 3200), 6500)
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(Math.max(v, lo), Math.max(lo, hi))
}

export function Tour({ onClose }: { onClose: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null)
  const [paused, setPaused] = useState(false)
  const card = useRef<HTMLDivElement>(null)

  // Not every control is always on the page — reduced motion drops `auto:`
  // entirely — and a step ringing nothing while describing a button that isn't
  // there is worse than no step. Fixed at mount: the chrome doesn't come and go.
  const [steps] = useState(() =>
    STEPS.filter((s) => !s.target || document.querySelector(s.target)),
  )
  const step = steps[i]
  const last = i === steps.length - 1

  const next = () => (last ? onClose() : setI((n) => n + 1))
  const back = () => setI((n) => Math.max(n - 1, 0))

  // onClose is a fresh closure every render; going through a ref keeps the
  // dwell timer below from restarting itself on every render and never firing.
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  // Reading this means they are not idle: the load nudge must not fire into it.
  useEffect(releaseNudge, [])

  // Hands-free: each step holds, then moves on. Hovering or focusing the card
  // pauses it, so nobody loses a sentence halfway through. Reduced motion opts
  // out entirely and waits to be driven.
  useEffect(() => {
    if (staticMode || paused) return
    const t = window.setTimeout(() => {
      if (last) closeRef.current()
      else setI((n) => n + 1)
    }, dwellMs(step))
    return () => window.clearTimeout(t)
  }, [i, paused, step, last])

  // All the targets are position:fixed chrome, so viewport coords are enough —
  // but the layout does move on resize, so re-measure on that.
  useLayoutEffect(() => {
    const measure = () => {
      const el = step.target ? document.querySelector<HTMLElement>(step.target) : null
      const r = el?.getBoundingClientRect() ?? null
      setRect(r)
      const h = card.current?.offsetHeight ?? 150
      const vw = window.innerWidth
      const vh = window.innerHeight
      if (!el || !r) {
        setPos({ left: (vw - CARD_W) / 2, top: Math.max((vh - h) / 2, EDGE) })
        return
      }
      // Ring the button, but clear the whole cluster it sits in — placing off
      // the button's own rect dropped the card straight onto its neighbours.
      const anchor = (el.closest('.seed-wrap') ?? el).getBoundingClientRect()
      let top = anchor.bottom + GAP
      if (top + h > vh - EDGE) top = anchor.top - GAP - h
      setPos({
        left: clamp(anchor.left + anchor.width / 2 - CARD_W / 2, EDGE, vw - CARD_W - EDGE),
        top: clamp(top, EDGE, vh - h - EDGE),
      })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [step, i])

  useEffect(() => {
    card.current?.focus()
  }, [i])

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        next()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        back()
      }
    }
    // capture: the tour answers Escape and the arrows before the tide does
    window.addEventListener('keydown', key, true)
    return () => window.removeEventListener('keydown', key, true)
  })

  const hold = () => setPaused(true)
  const release = () => setPaused(false)
  // Each step focuses the card so the new text is announced. That focus must
  // not count as "the visitor is reading" or the dwell timer never runs —
  // only focus landing on something *inside* the card pauses it.
  const holdIfInside = (e: FocusEvent) => {
    if (e.target !== card.current) setPaused(true)
  }

  return createPortal(
    <div className="tour-layer">
      {/* One scrim, punched through by the ring's own shadow so the control
          being described is the only lit thing on screen. */}
      {rect ? (
        <div
          className="tour-ring"
          style={{
            left: `${rect.left - 7}px`,
            top: `${rect.top - 5}px`,
            width: `${rect.width + 14}px`,
            height: `${rect.height + 10}px`,
          }}
        />
      ) : (
        <div className="tour-scrim" />
      )}
      <div
        ref={card}
        className="tour-card"
        role="dialog"
        aria-label="What is this — guided tour"
        tabIndex={-1}
        onMouseEnter={hold}
        onMouseLeave={release}
        onFocus={holdIfInside}
        onBlur={release}
        style={{
          width: `${CARD_W}px`,
          transform: `translate3d(${pos?.left ?? 0}px, ${pos?.top ?? 0}px, 0)`,
          visibility: pos ? 'visible' : 'hidden',
        }}
      >
        <div className="tour-meta">
          <span>
            {String(i + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
          </span>
          <button type="button" className="tour-skip" onClick={onClose}>
            close
          </button>
        </div>
        <h2 className="tour-title">{step.title}</h2>
        <p className="tour-body">{step.body}</p>
        <div className="tour-nav">
          <button type="button" onClick={back} disabled={i === 0}>
            ← back
          </button>
          <button type="button" className="tour-next" onClick={next}>
            {last ? 'done' : 'next →'}
          </button>
        </div>
        {!staticMode && (
          <div className="tour-clock" aria-hidden>
            <div
              key={`${i}-${paused}`}
              className="tour-clock-fill"
              style={{
                animationDuration: `${dwellMs(step)}ms`,
                animationPlayState: paused ? 'paused' : 'running',
              }}
            />
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
