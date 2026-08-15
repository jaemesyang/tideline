// Seeded ambient audio (§5): filtered noise swells at the tide's period, an
// occasional gull or buoy. Muted by default; this module is dynamic-imported
// the first time the visitor turns sound on, so Tone.js never touches the
// initial JS payload.
//
// Event timing draws from a dedicated mulberry32 keyed off the seed — a
// deterministic sequence that never touches deriveWorld's draw order.

import * as Tone from 'tone'
import { mulberry32, hashSeed } from '../seed/mulberry32'
import type { World } from '../seed/deriveWorld'

type Graph = {
  nodes: { dispose(): void }[]
  timers: number[]
}

let graph: Graph | null = null

function teardown() {
  if (!graph) return
  for (const t of graph.timers) window.clearTimeout(t)
  for (const n of graph.nodes) n.dispose()
  graph = null
}

export async function start(world: World) {
  await Tone.start()
  teardown()

  const rng = mulberry32(hashSeed(world.seed) ^ 0x5eabed)
  const { swellPeriod, filterHz, gullChance, buoyChance } = world.audio

  const master = new Tone.Gain(0).toDestination()
  master.gain.rampTo(0.9, 1.5) // fade the sea in, never cut it in

  const noise = new Tone.Noise('brown').start()
  const filter = new Tone.Filter(filterHz, 'lowpass')
  const swell = new Tone.Gain(0.1)
  noise.connect(filter)
  filter.connect(swell)
  swell.connect(master)

  // the swell: loudness breathes at the seeded period
  const swellLfo = new Tone.LFO({
    frequency: 1 / swellPeriod,
    min: 0.04,
    max: 0.24,
    phase: 90,
  })
  swellLfo.connect(swell.gain)
  swellLfo.start()

  // filter character drifts slower than the swell — surf, not a siren
  const colorLfo = new Tone.LFO({
    frequency: 1 / (swellPeriod * 2.7),
    min: filterHz * 0.6,
    max: filterHz * 1.35,
  })
  colorLfo.connect(filter.frequency)
  colorLfo.start()

  const gull = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.04, decay: 0.25, sustain: 0.1, release: 0.2 },
    portamento: 0.12,
  })
  const gullGain = new Tone.Gain(0.05)
  gull.connect(gullGain)
  gullGain.connect(master)

  const buoy = new Tone.Synth({
    oscillator: { type: 'sine' },
    envelope: { attack: 0.01, decay: 1.8, sustain: 0, release: 1.2 },
  })
  const buoyGain = new Tone.Gain(0.045)
  buoy.connect(buoyGain)
  buoyGain.connect(master)

  const timers: number[] = []
  const scheduleGull = () => {
    const wait = (8 + rng() * 10) * 1000
    timers.push(
      window.setTimeout(() => {
        if (rng() < gullChance) {
          const f = 950 + rng() * 450
          gull.triggerAttackRelease(f, 0.28)
          gull.frequency.rampTo(f * 0.68, 0.3)
        }
        scheduleGull()
      }, wait),
    )
  }
  const scheduleBuoy = () => {
    const wait = (14 + rng() * 12) * 1000
    timers.push(
      window.setTimeout(() => {
        if (rng() < buoyChance) buoy.triggerAttackRelease(196, 2)
        scheduleBuoy()
      }, wait),
    )
  }
  scheduleGull()
  scheduleBuoy()

  graph = {
    nodes: [master, noise, filter, swell, swellLfo, colorLfo, gull, gullGain, buoy, buoyGain],
    timers,
  }
}

export function stop() {
  teardown()
}
