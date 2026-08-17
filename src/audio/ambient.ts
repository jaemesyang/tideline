// Seeded ambient audio (§5). Not a drone: a deep-water bed plus a wash layer
// that breaks in discrete crashes — each wave builds bright, then hisses out
// darker as it drains, at the tide's own period. Occasional gull or buoy.
// Muted by default; dynamic-imported on first unmute so Tone.js stays out of
// the initial payload.
//
// Event timing draws from a dedicated mulberry32 keyed off the seed — a
// deterministic sequence that never touches deriveWorld's draw order.

import * as Tone from 'tone'
import { mulberry32, hashSeed } from '../seed/mulberry32'
import type { World } from '../seed/deriveWorld'
import { TUNING } from '../tuning'
import { surf } from '../lib/surf'

type Graph = {
  nodes: { dispose(): void }[]
  timers: Set<number>
  intervals: number[]
  master: Tone.Gain
}

let graph: Graph | null = null

const FADE_OUT = 0.9 // seconds — the sea is faded in, so fade it out too

/** Ride the level down, then dispose. A hard dispose clicked mid-wave. */
function fadeOutAndTeardown() {
  const g = graph
  if (!g) return
  graph = null
  for (const t of g.timers) window.clearTimeout(t)
  for (const i of g.intervals) window.clearInterval(i) // stop crashing mid-fade
  g.master.gain.rampTo(0, FADE_OUT)
  window.setTimeout(() => {
    for (const n of g.nodes) n.dispose()
  }, FADE_OUT * 1000 + 120)
}

/**
 * `cancelled` is checked after the two awaits that can outlast the click that
 * asked for sound. Without it, muting during the Tone.js load or the context
 * resume still built the whole graph and only tore it down afterwards.
 */
export async function start(world: World, cancelled: () => boolean = () => false) {
  if (cancelled()) return
  await Tone.start()
  if (cancelled()) return
  fadeOutAndTeardown()

  const rng = mulberry32(hashSeed(world.seed) ^ 0x5eabed)
  const { swellPeriod, filterHz, gullChance, buoyChance } = world.audio
  const weather = world.weather
  const graphNodes: { dispose(): void }[] = []

  // The crash / gull / buoy schedulers re-arm themselves forever. Pushing each
  // id onto an array grew it without bound for as long as the tab stayed open;
  // a set that drops its own entry on fire stays the size of what's pending.
  const timers = new Set<number>()
  const later = (fn: () => void, seconds: number) => {
    const id = window.setTimeout(() => {
      timers.delete(id)
      fn()
    }, seconds * 1000)
    timers.add(id)
  }

  const master = new Tone.Gain(0).toDestination()
  master.gain.rampTo(TUNING.audio.master, 2) // fade the sea in, never cut it in

  // weather color on the whole mix: snow muffles everything
  // lofi voicing: everything lives under a dark low-pass
  const voicing = new Tone.Filter(
    weather === 'snow' ? TUNING.audio.snowVoicingHz : TUNING.audio.voicingHz,
    'lowpass',
  )
  voicing.connect(master)

  // bed: deep water, constant, slow one-third-octave breathing
  const bedNoise = new Tone.Noise('brown').start()
  const bedFilter = new Tone.Filter(Math.max(180, filterHz * 0.3), 'lowpass')
  const bedGain = new Tone.Gain(0.14)
  bedNoise.connect(bedFilter)
  bedFilter.connect(bedGain)
  bedGain.connect(voicing)
  const bedLfo = new Tone.LFO({ frequency: 1 / (swellPeriod * 2.3), min: 0.1, max: 0.18 })
  bedLfo.connect(bedGain.gain)
  bedLfo.start()

  // wash: the breaking layer — pink noise through a bandpass that opens
  // bright on the crash and closes dark on the drain
  const washNoise = new Tone.Noise('pink').start()
  const washFilter = new Tone.Filter(filterHz, 'bandpass')
  washFilter.Q.value = 0.4
  const washGain = new Tone.Gain(0.015)
  washNoise.connect(washFilter)
  washFilter.connect(washGain)
  washGain.connect(voicing)

  // Crashes ride the water you are actually watching. Water.tsx publishes the
  // live swash run-up to lib/surf.ts every frame; a crash fires on the rising
  // edge of a front, so the sound and the picture break together. Before this
  // the wash ran on world.audio.swellPeriod, an entirely separate draw from
  // world.water.swash — the sea sounded like a different sea.
  const crashScale = weather === 'wind' ? 1.35 : weather === 'snow' ? 0.7 : 1
  let lastCrash = -Infinity
  const crash = (period: number) => {
    lastCrash = performance.now()
    const peak = (TUNING.audio.crashPeak.base + rng() * TUNING.audio.crashPeak.extra) * crashScale
    const rise = 0.6 + rng() * 0.45
    const fall = Math.max(period * 0.55, 1.5)
    washFilter.frequency.rampTo(480 + rng() * 380, rise)
    washGain.gain.rampTo(peak, rise)
    later(() => {
      washFilter.frequency.rampTo(230 + rng() * 110, fall)
      washGain.gain.rampTo(0.018, fall)
    }, rise)
  }

  // rising-edge detector with hysteresis, so one front fires exactly one crash
  const BREAK_AT = 0.5
  let armed = true
  const watchSurf = window.setInterval(() => {
    if (performance.now() - surf.at > 400) return // no frames: fallback owns it
    if (armed && surf.runup >= BREAK_AT) {
      armed = false
      crash(surf.period)
    } else if (!armed && surf.runup < BREAK_AT * 0.55) {
      armed = true
    }
  }, 50)

  // Fallback: hidden tab, reduced motion, or a scene that never mounted. Keeps
  // the sea alive on its own clock if nothing has broken in a while.
  const fallback = () => {
    const period = surf.period || swellPeriod
    if (performance.now() - lastCrash > period * 1.7 * 1000) crash(period)
    later(fallback, 0.75)
  }
  crash(surf.period || swellPeriod)
  later(fallback, 2)

  // rain: a fine patter above the surf
  if (weather === 'rain') {
    const patter = new Tone.Noise('white').start()
    const patterFilter = new Tone.Filter(2600, 'highpass')
    const patterGain = new Tone.Gain(TUNING.audio.rainPatterLevel)
    patter.connect(patterFilter)
    patterFilter.connect(patterGain)
    patterGain.connect(voicing)
    graphNodes.push(patter, patterFilter, patterGain)
  }

  // The one seed keeps time: three knocks, a beat, two more, and round again.
  // A wooden thud under the same lofi voicing as everything else.
  if (world.carnival) {
    const drum = new Tone.MembraneSynth({
      pitchDecay: 0.028,
      octaves: 2,
      envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 },
    })
    const drumGain = new Tone.Gain(TUNING.carnival.drumLevel)
    drum.connect(drumGain)
    drumGain.connect(voicing)
    // tung — tung — tung — · — sa — hur
    const BAR: [number, number][] = [
      [0, 184],
      [0.26, 184],
      [0.52, 184],
      [0.94, 138],
      [1.18, 110],
    ]
    // Schedule the whole bar at explicit, strictly increasing audio times. One
    // setTimeout per hit let two coalesce into the same instant, and Tone
    // rejects a retrigger that is not strictly later than the last one.
    const bar = () => {
      const t0 = Tone.now() + 0.06
      for (const [at, hz] of BAR) drum.triggerAttackRelease(hz, 0.11, t0 + at)
      later(bar, 1.86)
    }
    bar()
    graphNodes.push(drum, drumGain)
  }

  // gull: a soft falling cry, sometimes doubled — never in snow
  const gull = new Tone.Synth({
    oscillator: { type: 'triangle' },
    envelope: { attack: 0.03, decay: 0.18, sustain: 0.2, release: 0.25 },
  })
  const gullGain = new Tone.Gain(TUNING.audio.gullLevel)
  gull.connect(gullGain)
  gullGain.connect(voicing)
  const gullOdds = weather === 'snow' ? 0 : gullChance
  const cry = () => {
    const f = 1150 + rng() * 350
    gull.triggerAttackRelease(f, 0.3)
    gull.frequency.rampTo(f * 0.66, 0.24)
  }
  const scheduleGull = () => {
    later(() => {
      if (rng() < gullOdds) {
        cry()
        if (rng() < 0.5) later(cry, 0.4)
      }
      scheduleGull()
    }, 11 + rng() * 12)
  }
  scheduleGull()

  // buoy: a distant soft bell (FM), not a raw sine
  const buoy = new Tone.FMSynth({
    harmonicity: 2.01,
    modulationIndex: 6,
    oscillator: { type: 'sine' },
    modulation: { type: 'sine' },
    envelope: { attack: 0.005, decay: 2.6, sustain: 0, release: 1.5 },
    modulationEnvelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.4 },
  })
  const buoyGain = new Tone.Gain(TUNING.audio.buoyLevel)
  buoy.connect(buoyGain)
  buoyGain.connect(voicing)
  const scheduleBuoy = () => {
    later(() => {
      if (rng() < buoyChance) buoy.triggerAttackRelease(233, 2.5)
      scheduleBuoy()
    }, 16 + rng() * 14)
  }
  scheduleBuoy()

  graphNodes.push(
    master,
    voicing,
    bedNoise,
    bedFilter,
    bedGain,
    bedLfo,
    washNoise,
    washFilter,
    washGain,
    gull,
    gullGain,
    buoy,
    buoyGain,
  )

  graph = { nodes: graphNodes, timers, intervals: [watchSurf], master }
}

export function stop() {
  fadeOutAndTeardown()
}
