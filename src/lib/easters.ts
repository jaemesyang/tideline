// Which hidden things this tide carries. Rates live in tuning.ts → easters,
// from "you'll see a crab most visits" down to a rubber duck about one tide
// in forty. Nothing here is ever announced in the UI.
//
// Own rng stream (0xea57). Every draw happens in a fixed order whether or not
// its condition holds, so the set stays stable for a given seed — and adding
// a new egg at the END of the list leaves existing tides untouched.

import { mulberry32, hashSeed } from '../seed/mulberry32'
import { TUNING } from '../tuning'
import type { World } from '../seed/deriveWorld'

export type Easters = {
  crab: boolean
  footprints: boolean
  shootingStar: boolean
  whale: boolean
  glow: boolean
  duck: boolean
}

export function deriveEasters(world: World): Easters {
  const rng = mulberry32(hashSeed(world.seed) ^ 0xea57)
  const dCrab = rng()
  const dFoot = rng()
  const dStar = rng()
  const dWhale = rng()
  const dGlow = rng()
  const dDuck = rng()

  const E = TUNING.easters
  const night = world.timeOfDay === 'night'
  const wet = world.weather === 'rain' || world.weather === 'snow'

  return {
    crab: dCrab < E.crab,
    footprints: dFoot < E.footprints,
    shootingStar: night && dStar < E.shootingStar,
    whale: !wet && dWhale < E.whale,
    glow: night && !wet && dGlow < E.glow,
    duck: dDuck < E.duck,
  }
}
