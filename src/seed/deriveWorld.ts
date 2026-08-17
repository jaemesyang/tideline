// Everything the seed controls, derived in ONE fixed order from ONE rng
// instance. Never reorder, insert, or remove draws without bumping the
// draw-order note below — any change silently re-rolls every existing tide.
//
// Draw order:
//   1. time of day
//   2. weather
//   3. palette perturbation (hue, lightness)
//   4. water: 2 gerstner octaves, foam density, swash fronts
//   5. sand: tone, wet line, grain, small debris
//   6. wrack line: count, project/writing shuffle (about first, contact last), per-object placement
//   7. audio: swell period, filter, gull/buoy chance

import { mulberry32, hashSeed } from './mulberry32'
import {
  PALETTES,
  PALETTE_NAMES,
  perturbPalette,
  applyWeather,
  type Palette,
  type TimeOfDay,
  type Weather,
} from '../lib/palettes'
import { specimens, type Specimen } from '../content'
import { CARNIVAL_PALETTE, isCarnival } from '../lib/carnival'

export type GerstnerOctave = {
  amplitude: number
  period: number
  directionDeg: number
  phase: number
}

export type SwashFront = {
  period: number
  runup: number // fraction of exposed beach a run reaches
  phase: number
  noiseOffset: number // offsets the 1D edge noise so fronts never share a lace pattern
}

export type SandDebris = { x: number; y: number; size: number; rotation: number }

export type WrackItem = {
  specimen: Specimen
  catalogueNo: string // TL-01… assigned by tide order — the only legitimate numbering
  x: number // 0..1 along the strandline
  rotation: number // radians
  buriedDepth: number // 0 = resting on sand, 1 = fully buried
}

export type World = {
  seed: string
  timeOfDay: TimeOfDay
  weather: Weather
  paletteName: string
  hueShift: number
  lightShift: number
  palette: Palette // final: base → perturb → weather
  water: {
    gerstner: [GerstnerOctave, GerstnerOctave]
    foamDensity: number
    swash: SwashFront[]
  }
  sand: {
    toneShift: number
    wetLine: number // resting waterline position, 0..1 of viewport height
    grainScale: number
    debris: SandDebris[]
  }
  wrack: WrackItem[]
  audio: {
    swellPeriod: number // seconds
    filterHz: number
    gullChance: number
    buoyChance: number
  }
  /** The one seed that is not like the others. See lib/carnival.ts. */
  carnival: boolean
}

export const TIMES: readonly TimeOfDay[] = ['dawn', 'overcast', 'afternoon', 'dusk', 'night']
// NOTE: adding 'snow' (2026-08-14) re-rolled the weather of every existing
// tide — accepted deliberately; the notable-tides list was re-probed after.
export const WEATHERS: readonly Weather[] = ['clear', 'haze', 'rain', 'wind', 'snow']

export function deriveWorld(seed: string): World {
  const rng = mulberry32(hashSeed(seed))
  const range = (min: number, max: number) => min + rng() * (max - min)
  const int = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

  // 1–2. atmosphere
  const timeOfDay = TIMES[Math.floor(rng() * TIMES.length)]
  const weather = WEATHERS[Math.floor(rng() * WEATHERS.length)]

  // 3. palette
  const hueShift = range(-6, 6)
  const lightShift = range(-0.04, 0.04)
  const palette = applyWeather(perturbPalette(PALETTES[timeOfDay], hueShift, lightShift), weather)

  // 4. water — wind raises amplitude and foam, per the weather axis
  const windAmp = weather === 'wind' ? 1.4 : 1
  const octave = (ampMin: number, ampMax: number, perMin: number, perMax: number): GerstnerOctave => ({
    amplitude: range(ampMin, ampMax) * windAmp,
    period: range(perMin, perMax),
    directionDeg: range(-18, 18),
    phase: range(0, Math.PI * 2),
  })
  const gerstner: [GerstnerOctave, GerstnerOctave] = [
    octave(0.5, 1.0, 6, 11), // primary swell
    octave(0.15, 0.4, 2.5, 5), // chop
  ]
  const foamDensity = range(0.35, 0.8) * (weather === 'wind' ? 1.35 : 1)
  const swashCount = int(2, 3)
  const swash: SwashFront[] = []
  for (let i = 0; i < swashCount; i++) {
    swash.push({
      period: range(5, 9),
      runup: range(0.35, 0.75),
      phase: range(0, Math.PI * 2),
      noiseOffset: range(0, 100),
    })
  }

  // 5. sand
  const toneShift = range(-0.02, 0.02)
  const wetLine = range(0.5, 0.65)
  const grainScale = range(0.8, 1.4)
  const debrisCount = int(12, 24)
  const debris: SandDebris[] = []
  for (let i = 0; i < debrisCount; i++) {
    debris.push({
      x: rng(),
      y: rng(),
      size: range(0.3, 1),
      rotation: range(0, Math.PI * 2),
    })
  }

  // 6. wrack line — about pinned first, contact pinned last, always present.
  // Only projects/writing shuffle (Fisher-Yates) and fill the middle slots.
  // NOTE: the range was int(6, 9) (2026-08-14). With about+contact pinned the
  // shuffle pool only holds `specimens.length - 2` entries, so 8 and 9 both
  // meant "every specimen" and half of all tides carried the whole catalogue.
  // Changed 2026-08-15: same single draw, so nothing downstream shifted, but
  // existing tides now bring a different set of objects.
  const wrackCount = int(5, 8)
  const about = specimens.find((s) => s.kind === 'about')
  const contact = specimens.find((s) => s.kind === 'contact')
  const pool = specimens.filter((s) => s.kind !== 'about' && s.kind !== 'contact')
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  const middle = pool.slice(0, Math.min(wrackCount - 2, pool.length))
  const chosen = [about, ...middle, contact].filter((s): s is Specimen => s !== undefined)
  // x slots are a deterministic permutation of the exposure order — assigning
  // x by index made the wrack line run diagonally (x and z both tracked i).
  // Hash-sorted, zero extra rng draws, so the draw order note stays true.
  const slotRank: number[] = []
  chosen
    .map((s, i) => ({ i, key: hashSeed(`${seed}:${s.id}`) }))
    .sort((a, b) => a.key - b.key)
    .forEach(({ i }, rank) => {
      slotRank[i] = rank
    })
  const wrack: WrackItem[] = chosen.map((specimen, i) => ({
    specimen,
    catalogueNo: `TL-${String(i + 1).padStart(2, '0')}`,
    x: (slotRank[i] + 0.5) / chosen.length + range(-0.3, 0.3) / chosen.length,
    rotation: range(0, Math.PI * 2),
    buriedDepth: range(0.05, 0.45),
  }))

  // 7. audio
  const audio = {
    swellPeriod: range(6, 12) * (weather === 'wind' ? 0.75 : 1),
    filterHz: range(400, 1400),
    gullChance: range(0, 0.3),
    buoyChance: range(0, 0.2),
  }

  const world: World = {
    seed,
    timeOfDay,
    weather,
    paletteName: PALETTE_NAMES[timeOfDay],
    hueShift,
    lightShift,
    palette,
    water: { gerstner, foamDensity, swash },
    sand: { toneShift, wetLine, grainScale, debris },
    wrack,
    audio,
    carnival: false,
  }

  // Every draw above has already been made, so overriding here cannot shift any
  // other tide. Weather is pinned clear: rain or snow would only fight it.
  if (isCarnival(seed)) {
    return { ...world, weather: 'clear', paletteName: 'carnival', palette: CARNIVAL_PALETTE, carnival: true }
  }
  return world
}
