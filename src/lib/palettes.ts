// Five hand-authored palettes, one per time of day. The seed picks one and
// perturbs hue by at most ±6° and lightness by at most ±4%. Weather applies
// fixed deltas after that. Ink is never touched by weather — résumé stays legible.

export type PaletteRole = 'sky' | 'water' | 'sand' | 'foam' | 'ink'
export type Palette = Record<PaletteRole, string>

export type TimeOfDay = 'dawn' | 'overcast' | 'afternoon' | 'dusk' | 'night'
export type Weather = 'clear' | 'haze' | 'rain' | 'wind'

export const PALETTE_NAMES: Record<TimeOfDay, string> = {
  dawn: 'rose',
  overcast: 'pewter',
  afternoon: 'amber',
  dusk: 'plum',
  night: 'moon',
}

export const PALETTES: Record<TimeOfDay, Palette> = {
  dawn: {
    sky: '#d9c2bc',
    water: '#6e8291',
    sand: '#a8988a',
    foam: '#eadfd6',
    ink: '#33383e',
  },
  overcast: {
    sky: '#b4bbbc',
    water: '#46595f',
    sand: '#97907f',
    foam: '#dcdad2',
    ink: '#272c2e',
  },
  afternoon: {
    sky: '#e3c892',
    water: '#2e5e66',
    sand: '#cdaf7e',
    foam: '#efe3c8',
    ink: '#3b3222',
  },
  dusk: {
    sky: '#5c4a5a',
    water: '#2e3a50',
    sand: '#6e6058',
    foam: '#c9b8b0',
    ink: '#dcd5cd',
  },
  night: {
    sky: '#141b24',
    water: '#1e2b36',
    sand: '#3e3f3a',
    foam: '#8e9ba1',
    ink: '#c7ccce',
  },
}

type Hsl = { h: number; s: number; l: number }

export function hexToHsl(hex: string): Hsl {
  const n = parseInt(hex.slice(1), 16)
  const r = ((n >> 16) & 255) / 255
  const g = ((n >> 8) & 255) / 255
  const b = (n & 255) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  if (max === min) return { h: 0, s: 0, l }
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  let h: number
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return { h: h * 360, s, l }
}

export function hslToHex({ h, s, l }: Hsl): string {
  h = ((h % 360) + 360) % 360
  s = Math.min(1, Math.max(0, s))
  l = Math.min(1, Math.max(0, l))
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const a = s * Math.min(l, 1 - l)
    const c = l - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)))
    return Math.round(c * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** Whole-palette shift: hueShift in degrees (|≤6|), lightShift absolute (|≤0.04|). */
export function perturbPalette(p: Palette, hueShift: number, lightShift: number): Palette {
  const out = {} as Palette
  for (const role of Object.keys(p) as PaletteRole[]) {
    const c = hexToHsl(p[role])
    out[role] = hslToHex({ h: c.h + hueShift, s: c.s, l: c.l + lightShift })
  }
  return out
}

/** Fixed color deltas per weather. Ink untouched. Wind changes motion, not color. */
export function applyWeather(p: Palette, weather: Weather): Palette {
  if (weather === 'clear' || weather === 'wind') return { ...p }
  const out = { ...p }
  for (const role of ['sky', 'water', 'sand', 'foam'] as PaletteRole[]) {
    const c = hexToHsl(p[role])
    if (weather === 'haze') {
      // lift black point ~8%, compress contrast, mild desaturation
      out[role] = hslToHex({ h: c.h, s: c.s * 0.85, l: 0.08 + c.l * 0.86 })
    } else {
      // rain: desaturate, darken the water
      const desat = role === 'sand' ? 0.8 : 0.9
      const dl = role === 'water' ? -0.06 : 0
      out[role] = hslToHex({ h: c.h, s: c.s * desat, l: c.l + dl })
    }
  }
  return out
}
