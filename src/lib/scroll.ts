// Tide state: Lenis smooths native document scroll into `tide.progress`
// (0 = tide fully in, 1 = fully out). Read it inside useFrame via shoreZ();
// it deliberately never touches React state or zustand — a scroll position
// that re-renders per frame would blow the frame budget for nothing.
import Lenis from 'lenis'

export const tide = {
  progress: 0,
  /** px scrolled past the runway — the résumé block entering; labels yield to it */
  overshootPx: 0,
}

// Waterline in the water plane's local frame (shader vXZ.y; world z minus the
// plane's z offset). +24 parks the shore below the frame — beach submerged —
// and -24 leaves only a far water band near the horizon.
export const SHORE_IN = 24
export const SHORE_OUT = -24

export function shoreZ(): number {
  return SHORE_IN + (SHORE_OUT - SHORE_IN) * tide.progress
}

// The tide completes over the 500vh runway (4 viewport-heights of scroll);
// scroll past that is the deepest point — the résumé block — with the tide
// held fully out.
export const RUNWAY_VH = 500

let activeLenis: Lenis | null = null

/** "Let it go": ride the tide back in, then hand over (draw the new seed). */
export function scrollTideIn(onDone: () => void) {
  if (activeLenis) {
    activeLenis.scrollTo(0, { duration: 3.2, onComplete: onDone, lock: true })
  } else {
    window.scrollTo(0, 0)
    onDone()
  }
}

/** Smoothly return to the top (notable-tide loads). */
export function scrollToTop(duration = 1.2) {
  if (activeLenis) activeLenis.scrollTo(0, { duration })
  else window.scrollTo(0, 0)
}

/** The load-sequence nudge: the tide visibly begins to go out (§6). */
export function nudgeTide() {
  activeLenis?.scrollTo(0.16 * window.innerHeight, { duration: 2.6 })
}

export function initTideScroll(): () => void {
  const lenis = new Lenis({ autoRaf: true })
  activeLenis = lenis
  const sync = () => {
    const span = ((RUNWAY_VH - 100) / 100) * window.innerHeight
    tide.progress = span > 0 ? Math.min(lenis.scroll / span, 1) : 0
    tide.overshootPx = Math.max(lenis.scroll - span, 0)
  }
  lenis.on('scroll', sync)
  sync()
  return () => {
    lenis.destroy()
    if (activeLenis === lenis) activeLenis = null
    tide.progress = 0
    tide.overshootPx = 0
  }
}
