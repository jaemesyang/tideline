// Tide state: Lenis smooths native document scroll into `tide.progress`
// (0 = tide fully in, 1 = fully out). Read it inside useFrame via shoreZ();
// it deliberately never touches React state or zustand — a scroll position
// that re-renders per frame would blow the frame budget for nothing.
import Lenis from 'lenis'

export const tide = { progress: 0 }

// Waterline in the water plane's local frame (shader vXZ.y; world z minus the
// plane's z offset). +24 parks the shore below the frame — beach submerged —
// and -24 leaves only a far water band near the horizon.
export const SHORE_IN = 24
export const SHORE_OUT = -24

export function shoreZ(): number {
  return SHORE_IN + (SHORE_OUT - SHORE_IN) * tide.progress
}

export function initTideScroll(): () => void {
  const lenis = new Lenis({ autoRaf: true })
  const sync = () => {
    tide.progress = lenis.limit > 0 ? lenis.scroll / lenis.limit : 0
  }
  lenis.on('scroll', sync)
  sync()
  return () => {
    lenis.destroy()
    tide.progress = 0
  }
}
