import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector2, Vector3, Vector4, type ShaderMaterial } from 'three'
import { useSeed } from '../seed/useSeed'
import type { World } from '../seed/deriveWorld'
import type { TimeOfDay } from '../lib/palettes'
import { RIG } from '../lib/lightRig'
import { mulberry32, hashSeed } from '../seed/mulberry32'
import { shoreZ } from '../lib/scroll'
import { publishSurf } from '../lib/surf'
import { staticMode, STATIC_TIME } from '../lib/motion'
import { TUNING } from '../tuning'
import { deriveEasters } from '../lib/easters'
import vert from '../shaders/water.vert'
import frag from '../shaders/water.frag'

// A fish-shadow school's wander path: sum of two slow sines per axis,
// evaluated in JS each frame and handed to the shader as one vec4.
type SchoolPath = {
  ax1: number
  aw1: number
  ap1: number
  ax2: number
  aw2: number
  ap2: number
  depthBase: number
  depthWob: number
  dw: number
  dp: number
}

function schoolAt(s: SchoolPath, t: number): [number, number] {
  return [
    Math.sin(t * s.aw1 + s.ap1) * s.ax1 + Math.sin(t * s.aw2 + s.ap2) * s.ax2,
    s.depthBase + Math.sin(t * s.dw + s.dp) * s.depthWob,
  ]
}

const DEG = Math.PI / 180

// Strength of the reflected sun/moon lane per time of day. A low sun throws
// the longest, brightest column; an overcast sky throws none at all.
const LANE: Record<TimeOfDay, number> = {
  dawn: 0.26,
  overcast: 0,
  afternoon: 0.17,
  dusk: 0.25,
  night: 0.12,
}

// Raw sRGB components. three's Color would convert to linear, but our raw
// ShaderMaterial never re-encodes its output, so we do all math in sRGB.
function srgb(hex: string): Vector3 {
  const n = parseInt(hex.slice(1), 16)
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

function laneStrength(world: World): number {
  const w = world.weather
  if (w === 'rain' || w === 'snow') return 0 // no sun to reflect
  return LANE[world.timeOfDay] * (w === 'haze' ? 0.45 : w === 'wind' ? 0.8 : 1)
}

export function Water() {
  const world = useSeed((s) => s.world)
  const mat = useRef<ShaderMaterial>(null)

  // decorative stream, keyed off the seed — never touches deriveWorld's draws
  const schools = useMemo(() => {
    const rng = mulberry32(hashSeed(world.seed) ^ 0xf15f)
    const n = TUNING.life.fishSchools.min + Math.floor(rng() * TUNING.life.fishSchools.extra)
    return Array.from({ length: n }, (): SchoolPath => ({
      ax1: 8 + rng() * 7,
      aw1: 0.05 + rng() * 0.05,
      ap1: rng() * Math.PI * 2,
      ax2: 3 + rng() * 3,
      aw2: 0.11 + rng() * 0.08,
      ap2: rng() * Math.PI * 2,
      depthBase: 4 + rng() * 3.5,
      depthWob: 1 + rng() * 1.5,
      dw: 0.06 + rng() * 0.05,
      dp: rng() * Math.PI * 2,
    }))
  }, [world.seed])

  // Standing water the ebb leaves on the beach: pools in the low spots and one
  // rill draining between them. Decorative stream, so deriveWorld is untouched.
  const beach = useMemo(() => {
    const rng = mulberry32(hashSeed(world.seed) ^ 0xbeac)
    const n = rng() < 0.18 ? 0 : 2 + Math.floor(rng() * 2) // most tides hold water
    const pools = [0, 1, 2].map((i) => {
      if (i >= n) return new Vector4(0, 0, 0, 1)
      return new Vector4(
        -16 + rng() * 32, // x
        3 + rng() * 16, // z: mid beach, uncovered well before the deepest point
        1.6 + rng() * 2.6, // radius
        0.42 + rng() * 0.3, // squashed across the slope, as they really are
      )
    })
    const rill = new Vector3(-13 + rng() * 26, rng() * 6.28, rng() < 0.62 ? 1 : 0)
    return { pools, rill }
  }, [world.seed])

  const uniforms = useMemo(() => {
    const [o1, o2] = world.water.gerstner
    // period draws double as wavelength (×1.4 world units) and temporal period (s)
    const octave = (o: typeof o1) =>
      [o.amplitude * TUNING.water.amplitude, o.period * 1.4, 90 * DEG + o.directionDeg * DEG, o.phase] as const
    // three's array-uniform upload requires Vector4 instances, not plain arrays
    const swash = [0, 1, 2].map((i) => {
      const s = world.water.swash[i]
      return s
        ? new Vector4(s.runup * 4.5, (2 * Math.PI) / s.period, s.phase, s.noiseOffset)
        : new Vector4(0, 1, 0, 0)
    })
    return {
      uTime: { value: staticMode ? STATIC_TIME : 0 },
      uOctave1: { value: octave(o1) },
      uOctave2: { value: octave(o2) },
      uOmega: { value: [(2 * Math.PI) / o1.period, (2 * Math.PI) / o2.period] },
      uShoreZ: { value: shoreZ() },
      uWaterColor: { value: srgb(world.palette.water) },
      uSkyColor: { value: srgb(world.palette.sky) },
      // sand.toneShift is drawn by deriveWorld but was never consumed anywhere,
      // so every tide got an identical beach tone. The raw draw is ±0.02 —
      // amplified here to a visible lighter/darker sand without touching the
      // draw order. (sand.wetLine went the same way — see setTideRest.)
      uSandColor: { value: srgb(world.palette.sand).addScalar(world.sand.toneShift * 6).clampScalar(0, 1) },
      uFoamColor: { value: srgb(world.palette.foam) },
      uFoamDensity: { value: world.water.foamDensity },
      uHorizonBleed: { value: world.weather === 'haze' ? 0.9 : 0.55 },
      uRain: { value: world.weather === 'rain' ? 1 : 0 },
      uGrainScale: { value: world.sand.grainScale },
      uSwashA: { value: swash[0] },
      uSwashB: { value: swash[1] },
      uSwashC: { value: swash[2] },
      uSchoolA: { value: new Vector4(0, 5, 1, 0) },
      uSchoolB: { value: new Vector4(0, 5, 1, 0) },
      uSchoolOn: { value: [schools.length > 0 ? 1 : 0, schools.length > 1 ? 1 : 0] },
      uGlow: { value: deriveEasters(world).glow ? 1 : 0 },
      // the lane sits under the sun, so it follows the same rig the objects light from
      uLane: { value: new Vector2(RIG[world.timeOfDay].dir[0] * 1.1, laneStrength(world)) },
      uPoolA: { value: beach.pools[0] },
      uPoolB: { value: beach.pools[1] },
      uPoolC: { value: beach.pools[2] },
      uRill: { value: beach.rill },
      uSnow: { value: world.weather === 'snow' ? 1 : 0 },
    }
  }, [world, schools, beach])

  useFrame((state) => {
    if (!mat.current) return
    const u = mat.current.uniforms
    const t = staticMode ? STATIC_TIME : state.clock.elapsedTime
    if (!staticMode) u.uTime.value = state.clock.elapsedTime
    u.uShoreZ.value = shoreZ()
    publishSurf(world.water.swash, t) // the ambient audio breaks with these fronts
    const targets = [u.uSchoolA.value as Vector4, u.uSchoolB.value as Vector4]
    for (let i = 0; i < schools.length && i < 2; i++) {
      const [x, d] = schoolAt(schools[i], t)
      const [x2, d2] = schoolAt(schools[i], t + 0.6)
      // heading from the path tangent (depth grows seaward: world z = shore - depth)
      const hx = x2 - x
      const hz = -(d2 - d)
      const len = Math.hypot(hx, hz) || 1
      targets[i].set(x, d, hx / len, hz / len)
    }
  })

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 8]}>
      <planeGeometry args={[110, 56, 192, 128]} />
      <shaderMaterial key={world.seed} ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} />
    </mesh>
  )
}
