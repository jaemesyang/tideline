// prefers-reduced-motion gets a static composition (§2): one still frame of
// this seed's beach, tide most of the way out, everything exposed and legible.
// Evaluated once at load — a mid-session preference flip re-applies on reload.
import { tide } from './scroll'

export const staticMode =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Where the frozen tide sits: far water band high, wrack fully exposed. */
export const STATIC_TIDE = 0.92

/** The frozen shader clock — an authored moment, same on every device. */
export const STATIC_TIME = 37.4

if (staticMode) {
  tide.progress = STATIC_TIDE
}
