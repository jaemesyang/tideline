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

/** Linear RGB-space blend of two hex colors. */
export function mixHex(a: string, b: string, t: number): string {
  const na = parseInt(a.slice(1), 16)
  const nb = parseInt(b.slice(1), 16)
  const ch = (sh: number) => {
    const va = (na >> sh) & 255
    const vb = (nb >> sh) & 255
    return Math.round(va + (vb - va) * t)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${ch(16)}${ch(8)}${ch(0)}`
}

/** Fixed color deltas per weather. Ink untouched. */
export function applyWeather(p: Palette, weather: Weather): Palette {
  if (weather === 'clear') return { ...p }
  const out = { ...p }
  const adjust = (role: PaletteRole, ds: number, dl: number) => {
    const c = hexToHsl(p[role])
    out[role] = hslToHex({ h: c.h, s: c.s * ds, l: c.l + dl })
  }
  if (weather === 'haze') {
    // hard black-point lift + contrast compression, then bleed sky into water
    for (const role of ['sky', 'water', 'sand', 'foam'] as PaletteRole[]) {
      const c = hexToHsl(p[role])
      out[role] = hslToHex({ h: c.h, s: c.s * 0.8, l: 0.1 + c.l * 0.84 })
    }
    out.water = mixHex(out.water, out.sky, 0.25)
  } else if (weather === 'rain') {
    adjust('sky', 0.9, 0)
    adjust('water', 0.9, -0.06)
    adjust('sand', 0.8, 0)
    adjust('foam', 0.9, 0)
  } else {
    // wind: churned water and foam read lighter and greyer
    adjust('sky', 0.95, 0)
    adjust('water', 0.92, 0.03)
    adjust('foam', 1, 0.04)
  }
  return out
}
