// Every dial in one place. These are presentation knobs — changing them never
// affects determinism (no rng draws happen here; deriveWorld's draw order is
// the only thing that re-rolls existing tides).
//
// Shader-side dials (foam thresholds, crest lighting, sand grain, wave
// perspective) live at the top of src/shaders/water.frag and water.vert under
// their own TUNING headers — GLSL constants can't import from here.

export const TUNING = {
  scroll: {
    /** Total page height in vh; the tide completes over (runwayVh - 100). */
    runwayVh: 500,
    /** Seconds for "Let it go" to ride the tide back in. */
    letGoSeconds: 3.2,
    /** Seconds for the résumé → button to reach the deepest point. */
    resumeSeconds: 2.4,
    /** Idle seconds before the tide nudges itself out; 0 disables. */
    nudgeAfterSeconds: 4.5,
    /** Auto mode: seconds for the whole tide to go out, top → résumé. */
    autoSeconds: 75,
  },

  objects: {
    /** Uniform scale on all wrack objects. */
    scale: 1.35,
    /** Brightness of a just-exposed (wet) object; 1 = dry. */
    wetTone: 0.85,
    /** Seconds a surfaced object takes to dry to full brightness. */
    drySeconds: 7,
    /** How strongly submerged objects tint toward the water color (0..1). */
    submergeTint: 0.75,
    /** Snow tides: seconds of lying exposed before an object is fully dusted. */
    snowSeconds: 26,
    /** How white it gets — snow settles on it, it does not become a snowball. */
    snowCover: 0.42,
  },

  water: {
    /** Master multiplier on Gerstner wave amplitude. */
    amplitude: 0.68,
  },

  life: {
    /** Sandpipers on the beach: min + up-to-extra. */
    sandpipers: { min: 2, extra: 3 },
    /** Fish-shadow schools in the shallows (shader supports at most 2). */
    fishSchools: { min: 1, extra: 2 },
    /** Gulls overhead on fair-weather daytime tides. */
    gulls: { min: 2, extra: 2 },
    /** Chance a fair-weather daytime tide carries a sail on the horizon. */
    sailChance: 0.45,
    /** Dried kelp bits along the old high-water mark. */
    strandPieces: { min: 26, extra: 16 },
    /** Fish that breach and splash back (never in rain or snow). */
    jumpingFish: { min: 1, extra: 2 },
    /** Seconds between one fish's jumps: min + up-to-extra. */
    jumpGap: { min: 5, extra: 9 },
    /** Chance a snow tide has ice in the water, and how many floes. */
    icebergChance: 0.55,
    icebergs: { min: 3, extra: 4 },
  },

  /** Hidden things. Each is an independent per-tide chance, 0..1.
   *  Some are meant to be common enough to notice, some to be talked about. */
  easters: {
    crab: 0.34, // common — a crab working the sand
    footprints: 0.2, // someone walked here before the tide turned
    shootingStar: 0.3, // of night tides only
    whale: 0.08, // rare — a back and a spout, far out
    glow: 0.12, // of clear night tides — bioluminescent surf
    duck: 0.025, // very rare, and deliberately absurd
  },

  clouds: {
    /** Coverage 0..1 by weather; overcast time-of-day forces at least `overcastTime`. */
    cover: { clear: 0.28, wind: 0.42, rain: 0.7, snow: 0.72, haze: 0 } as Record<string, number>,
    overcastTime: 0.8,
  },

  audio: {
    /** Overall level 0..1. */
    master: 0.58,
    /** Lofi low-pass over the whole mix, Hz (snow value muffles harder). */
    voicingHz: 2400,
    snowVoicingHz: 850,
    /** Crash loudness: base + up-to-extra, before weather scaling. */
    crashPeak: { base: 0.1, extra: 0.06 },
    /** Voice levels. */
    gullLevel: 0.024,
    buoyLevel: 0.03,
    rainPatterLevel: 0.013,
  },
} as const
