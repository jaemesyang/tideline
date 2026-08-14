// Debug page: /?debug&seed=xxxx-xxxx
// Dumps every seeded value plus a hash of the dump. Checkpoint test: open the
// same seed in two browsers — hash must match character for character.

import { useSeed } from './useSeed'
import { PALETTES, applyWeather, type TimeOfDay, type Weather, type Palette } from '../lib/palettes'

const TIMES: TimeOfDay[] = ['dawn', 'overcast', 'afternoon', 'dusk', 'night']
const WEATHERS: Weather[] = ['clear', 'haze', 'rain', 'wind']

function fnv(s: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(16).padStart(8, '0')
}

function Strip({ palette, label }: { palette: Palette; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ width: 150, flexShrink: 0 }}>{label}</span>
      {(Object.keys(palette) as (keyof Palette)[]).map((role) => (
        <div key={role} style={{ textAlign: 'center' }}>
          <div style={{ width: 72, height: 36, background: palette[role] }} />
          <span style={{ fontSize: 10 }}>
            {role} {palette[role]}
          </span>
        </div>
      ))}
    </div>
  )
}

export function SeedDebug() {
  const { seed, world } = useSeed()
  const dump = JSON.stringify(world, null, 2)
  return (
    <main
      style={{
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        lineHeight: 1.5,
        padding: 24,
        background: '#111',
        color: '#ddd',
        minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: 14 }}>tideline · seed debug</h1>
      <p>
        seed <strong>{seed}</strong> · dump hash <strong>{fnv(dump)}</strong>
      </p>

      <h2 style={{ fontSize: 13, marginTop: 24 }}>this tide</h2>
      <Strip palette={world.palette} label={`${world.timeOfDay} / ${world.weather}`} />

      <h2 style={{ fontSize: 13, marginTop: 24 }}>palette × weather grid (base, unperturbed)</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {TIMES.map((t) =>
          WEATHERS.map((w) => (
            <Strip key={`${t}-${w}`} palette={applyWeather(PALETTES[t], w)} label={`${t} / ${w}`} />
          )),
        )}
      </div>

      <h2 style={{ fontSize: 13, marginTop: 24 }}>full world dump</h2>
      <pre style={{ whiteSpace: 'pre-wrap' }}>{dump}</pre>
    </main>
  )
}
