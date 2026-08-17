import type { Palette } from './palettes'

// One seed is not like the others.
//
// Everything here is applied AFTER deriveWorld has made every one of its draws,
// so the draw order is untouched and no other tide shifts by a hair. The seed
// is never listed in the log and nothing in the UI hints at it — it is found by
// being told, or by typing it into the paste box.

export const CARNIVAL_SEED = '6767-6767'

export function isCarnival(seed: string): boolean {
  return seed === CARNIVAL_SEED
}

// Ink and paper stay hand-authored and boring on purpose: the scene goes
// completely off the rails, and the résumé still has to be readable on top of
// it. Everything else is turned up as far as it goes.
export const CARNIVAL_PALETTE: Palette = {
  sky: '#2a0a4a',
  water: '#7a1fd0',
  sand: '#ffb01f',
  foam: '#fff6ff',
  ink: '#1a1020',
  paper: '#fff4fb',
}
