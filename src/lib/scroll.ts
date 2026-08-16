// Tide state: Lenis smooths native document scroll into `tide.progress`
// (0 = tide fully in, 1 = fully out). Read it inside useFrame via shoreZ();
// it deliberately never touches React state or zustand — a scroll position
// that re-renders per frame would blow the frame budget for nothing.
import Lenis from 'lenis'
import { TUNING } from '../tuning'

export const tide = {
  progress: 0,
  /** px scrolled past the runway — the résumé block entering; labels yield to it */
  overshootPx: 0,
}

// Waterline in the water plane's local frame (shader vXZ.y; world z minus the
// plane's z offset). ~+24 parks the shore below the frame — beach submerged —
// and -24 leaves only a far water band near the horizon.
export const SHORE_IN = 24
export const SHORE_OUT = -24

// Where this particular tide rests when it is fully in. deriveWorld draws a
// `sand.wetLine` per seed for exactly this and nothing ever read it, so every
// tide came in to the same mark; setTideRest() wires it up. Kept inside
// SHORE_IN ± a few units so the intro is always open water.
const rest = { shoreIn: SHORE_IN }

/** `wetLine` is deriveWorld's 0.5–0.65 draw, spread across a visible range.
 *  Higher = a fuller tide that rests further up the beach. */
export function setTideRest(wetLine: number): void {
  const t = Math.min(Math.max((wetLine - 0.5) / 0.15, 0), 1)
  rest.shoreIn = 21.5 + t * 5.5
}

export function shoreZ(): number {
  return rest.shoreIn + (SHORE_OUT - rest.shoreIn) * tide.progress
}

// The water plane is 56 deep (see Water.tsx), so its far edge sits at -28 in
// the same space. That edge IS the horizon: there is no water drawn beyond it,
// only sky. Anything placed seaward of it stops floating on the sea and starts
// floating in the sky.
export const WATER_FAR = -28

/**
 * Park something `depth` out from the waterline, but never past the horizon
 * and never up on the sand. As the tide runs out the sea narrows to a band a
 * few units wide; this keeps whales, floes and breaching fish inside it.
 * `margin` is roughly the thing's own half-depth. Keep it under 2 — the band
 * is only 4 wide at SHORE_OUT.
 */
export function seawardZ(shore: number, depth: number, margin = 1.2): number {
  const far = WATER_FAR + margin
  const near = Math.max(shore - margin, far)
  return Math.min(Math.max(shore - depth, far), near)
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

/** How far up the beach something sits, 0 near the camera → 1 at the horizon. */
export function distanceOut(z: number): number {
  return smoothstep(-6, WATER_FAR, z)
}

/**
 * How distant something floating in the sea should read, 0 → 1. Two things
 * have to agree: the shader hazes water by its depth below the waterline
 * (`smoothstep(9, 26, depth)` in water.frag), while the horizon itself is
 * fixed in plane space. Take whichever says "further out", or a whale sits
 * unhazed and full size in water that has already washed out to sky.
 */
export function seaDistance(shore: number, z: number): number {
  return Math.max(smoothstep(9, 26, shore - z), distanceOut(z))
}

// The tide completes over the 500vh runway (4 viewport-heights of scroll);
// scroll past that is the deepest point — the résumé block — with the tide
// held fully out.
export const RUNWAY_VH = TUNING.scroll.runwayVh

let activeLenis: Lenis | null = null

/** "Let it go": ride the tide back in, then hand over (draw the new seed). */
export function scrollTideIn(onDone: () => void) {
  releaseNudge()
  stopAutoTide()
  if (activeLenis) {
    activeLenis.scrollTo(0, { duration: TUNING.scroll.letGoSeconds, onComplete: onDone, lock: true })
  } else {
    window.scrollTo(0, 0)
    onDone()
  }
}

/** Smoothly return to the top (notable-tide loads). */
export function scrollToTop(duration = 1.2) {
  releaseNudge()
  stopAutoTide()
  if (activeLenis) activeLenis.scrollTo(0, { duration })
  else window.scrollTo(0, 0)
}

// Keys that mean "move the page". Lenis cancels its own tweens on wheel and
// touch but never sees the keyboard, so anything programmatic has to watch for
// these itself — and only these: Tab, Escape and typing must not count as
// scroll input, or opening a panel by keyboard cancels the tide.
const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  'Home',
  'End',
  ' ',
  'Spacebar',
])

function isScrollKey(e: KeyboardEvent): boolean {
  if (e.metaKey || e.ctrlKey || e.altKey) return false
  const el = e.target as HTMLElement | null
  if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return false
  return SCROLL_KEYS.has(e.key)
}

// The load nudge is a one-time thing for a visitor who has done nothing yet.
// Once anyone takes the wheel — a scroll, a key, a tide loaded from the log —
// it must stay dead, or it fires into the middle of whatever they asked for.
let handedOver = false

/** The visitor has taken the wheel; the load nudge is off for good. */
export function releaseNudge(): void {
  handedOver = true
}

/** The load-sequence nudge: the tide visibly begins to go out (§6). */
export function nudgeTide() {
  if (handedOver || isAutoRunning()) return // someone else is already driving
  activeLenis?.scrollTo(0.16 * window.innerHeight, { duration: 2.6 })
}

/** Document-y of the résumé block's resting position. */
function resumeTargetY(): number | null {
  const el = document.querySelector<HTMLElement>('.resume-block')
  if (!el) return null
  return el.getBoundingClientRect().top + window.scrollY - 28
}

/** The recruiter exit: ride the tide all the way out to the résumé block. */
export function scrollToResume() {
  releaseNudge()
  stopAutoTide() // never let two programmatic scrolls fight
  const el = document.querySelector<HTMLElement>('.resume-block')
  if (!el) return
  if (activeLenis) activeLenis.scrollTo(el, { duration: TUNING.scroll.resumeSeconds, offset: -28 })
  else el.scrollIntoView(true)
}

// --- auto mode ------------------------------------------------------------
// The tide goes out on its own, at a constant pace, ending at the résumé.
// Never a scroll-jack: any wheel, touch, or key input hands control straight
// back to the visitor and switches the mode off.

let autoStop: (() => void) | null = null

export function isAutoRunning(): boolean {
  return autoStop !== null
}

/** Start auto mode. `onEnd` fires when it finishes OR the visitor interrupts. */
export function startAutoTide(onEnd: () => void) {
  releaseNudge()
  stopAutoTide()
  const lenis = activeLenis
  const target = resumeTargetY()
  if (!lenis || target === null) {
    onEnd()
    return
  }

  const remaining = target - lenis.scroll
  if (remaining < 8) {
    onEnd()
    return
  }

  // constant pace: a tide started halfway takes half as long as one from the top
  const duration = TUNING.scroll.autoSeconds * Math.min(remaining / Math.max(target, 1), 1)

  let done = false
  const finish = () => {
    if (done) return
    done = true
    window.removeEventListener('wheel', interrupt)
    window.removeEventListener('touchstart', interrupt)
    window.removeEventListener('keydown', onKey)
    autoStop = null
    onEnd()
  }
  // halt the tween where it stands, then let the visitor carry on
  function interrupt() {
    if (done) return
    lenis!.scrollTo(lenis!.scroll, { immediate: true })
    finish()
  }
  // only actual scroll intent: tabbing to the chrome or pressing Escape to
  // close a panel used to kill the tide too
  const onKey = (e: KeyboardEvent) => {
    if (isScrollKey(e)) interrupt()
  }

  window.addEventListener('wheel', interrupt, { passive: true })
  window.addEventListener('touchstart', interrupt, { passive: true })
  window.addEventListener('keydown', onKey)
  autoStop = interrupt

  lenis.scrollTo(target, {
    duration,
    easing: (t: number) => t, // linear — a tide doesn't ease
    onComplete: finish,
  })
}

export function stopAutoTide() {
  autoStop?.()
}

// Lenis smooths wheel and touch but never sees the keyboard, so key scrolling
// fought it: the browser moved the document natively and Lenis yanked it back
// on the next frame — dead for the whole length of any in-flight tween (the
// load nudge, most visibly), and unsmoothed 40px hops the rest of the time.
// Drive it explicitly instead, so a keyboard visitor gets the same tide.
function keyScroll(lenis: Lenis, e: KeyboardEvent) {
  if (!isScrollKey(e)) return
  const vh = window.innerHeight
  const max = Math.max(document.documentElement.scrollHeight - vh, 0)
  const from = lenis.targetScroll ?? lenis.scroll
  const page = vh * 0.9
  const step = vh * 0.18
  let to = from
  switch (e.key) {
    case 'Home':
      to = 0
      break
    case 'End':
      to = max
      break
    case 'PageDown':
      to = from + page
      break
    case 'PageUp':
      to = from - page
      break
    case ' ':
    case 'Spacebar':
      to = from + (e.shiftKey ? -page : page)
      break
    case 'ArrowDown':
      to = from + step
      break
    case 'ArrowUp':
      to = from - step
      break
  }
  e.preventDefault()
  releaseNudge()
  // Removing auto's own keydown listener mid-dispatch keeps it from firing
  // after this one and immediately undoing the scroll we just asked for.
  stopAutoTide()
  lenis.scrollTo(Math.min(Math.max(to, 0), max), { duration: 0.55 })
}

export function initTideScroll(): () => void {
  const lenis = new Lenis({ autoRaf: true })
  activeLenis = lenis
  const onKey = (e: KeyboardEvent) => keyScroll(lenis, e)
  window.addEventListener('keydown', onKey)
  window.addEventListener('wheel', releaseNudge, { passive: true, once: true })
  window.addEventListener('touchstart', releaseNudge, { passive: true, once: true })
  const sync = () => {
    const span = ((RUNWAY_VH - 100) / 100) * window.innerHeight
    tide.progress = span > 0 ? Math.min(lenis.scroll / span, 1) : 0
    tide.overshootPx = Math.max(lenis.scroll - span, 0)
  }
  lenis.on('scroll', sync)
  sync()
  return () => {
    window.removeEventListener('keydown', onKey)
    window.removeEventListener('wheel', releaseNudge)
    window.removeEventListener('touchstart', releaseNudge)
    lenis.destroy()
    if (activeLenis === lenis) activeLenis = null
    tide.progress = 0
    tide.overshootPx = 0
  }
}
