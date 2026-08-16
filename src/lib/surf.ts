// Live surf state: written every frame by the water (scene/Water.tsx), read by
// the ambient audio (audio/ambient.ts). Same bridge pattern as `tide` in
// scroll.ts — per-frame data that never touches React state.
//
// Why it exists: the audio used to break on `world.audio.swellPeriod` while the
// water broke on `world.water.swash[i].period`. Those are independent draws, so
// the crash you heard had nothing to do with the wave you were watching. Now
// the sound follows the picture.

export const surf = {
  /** 0..1 — how far up the beach the strongest swash front has run, this frame.
   *  Exactly the `r` term the fragment shader uses, maxed over all fronts. */
  runup: 0,
  /** Seconds. Period of the front currently doing the work — the audio's
   *  envelope lengths and its idle fallback both scale off this. */
  period: 8,
  /** performance.now() of the last write. The audio checks this: with the tab
   *  hidden there are no frames, and it falls back to its own timer. */
  at: 0,
}

export function publishSurf(
  swash: readonly { period: number; phase: number; runup: number }[],
  t: number,
): void {
  let strongest = 0
  let period = surf.period
  for (const s of swash) {
    // matches water.frag: pow(max(sin(omega * t + phase), 0), 0.7)
    const r = Math.pow(Math.max(Math.sin(((2 * Math.PI) / s.period) * t + s.phase), 0), 0.7) * s.runup
    if (r > strongest) {
      strongest = r
      period = s.period
    }
  }
  surf.runup = Math.min(strongest / 0.75, 1) // runup draws 0.35–0.75; normalise
  surf.period = period
  surf.at = performance.now()
}
