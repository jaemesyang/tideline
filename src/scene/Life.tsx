import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { type Group, type Mesh, type MeshLambertMaterial } from 'three'
import { useSeed } from '../seed/useSeed'
import { mulberry32, hashSeed } from '../seed/mulberry32'
import { mixHex } from '../lib/palettes'
import { shoreZ, seawardZ, distanceOut, seaDistance } from '../lib/scroll'
import { TUNING } from '../tuning'

// Life in and around the water: sandpipers working the swash, a sail on some
// horizons, fish that breach, and ice on some snow tides. All of it runs off
// decorative rng streams keyed to the seed — deterministic, zero impact on
// deriveWorld's draw order.

const PLANE_Z = 8

// Sandpipers chase the swash line: they scurry up the beach ahead of each
// run-up and follow the water back down as it drains. The same swash-front
// math as the shader, minus the per-x lace.
function swashFront(
  swash: { period: number; runup: number; phase: number }[],
  shore: number,
  t: number,
): number {
  let front = shore
  for (const s of swash) {
    const r = Math.pow(Math.max(Math.sin(((2 * Math.PI) / s.period) * t + s.phase), 0), 0.7)
    front = Math.max(front, shore + s.runup * 4.5 * r)
  }
  return front
}

function Sandpipers() {
  const world = useSeed((s) => s.world)
  const flock = useRef<Group>(null)
  const zs = useRef<number[]>([])
  const xPrev = useRef<number[]>([])

  const birds = useMemo(() => {
    const rng = mulberry32(hashSeed(world.seed) ^ 0x51de)
    const n = TUNING.life.sandpipers.min + Math.floor(rng() * TUNING.life.sandpipers.extra)
    zs.current = []
    xPrev.current = []
    return Array.from({ length: n }, () => ({
      x0: -14 + rng() * 28,
      xAmp: 3 + rng() * 5,
      xw: 0.07 + rng() * 0.06,
      xp: rng() * Math.PI * 2,
      off: 0.9 + rng() * 1.1, // how far above the water's edge it keeps
      size: 0.9 + rng() * 0.35,
      bob: rng() * Math.PI * 2,
    }))
  }, [world.seed])

  const plumage = useMemo(() => mixHex(world.palette.ink, world.palette.sand, 0.4), [world])

  useFrame((state, dt) => {
    const g = flock.current
    if (!g) return
    const t = state.clock.elapsedTime
    const shore = shoreZ()
    const front = swashFront(world.water.swash, shore, t)
    // pipers work the beach only once there is beach to work
    const show = Math.min(Math.max((10 - shore) / 4, 0), 1)
    for (let i = 0; i < g.children.length; i++) {
      const d = birds[i]
      if (!d) continue
      const b = g.children[i]
      const x = d.x0 + Math.sin(t * d.xw + d.xp) * d.xAmp + Math.sin(t * 0.31 + d.xp * 2) * 1.2
      const targetZ = Math.min(front + d.off, 20)
      const z = (zs.current[i] ??= targetZ)
      const nz = z + (targetZ - z) * Math.min(1, dt * 2.6)
      zs.current[i] = nz
      const dx = x - (xPrev.current[i] ?? x)
      xPrev.current[i] = x
      const speed = Math.abs(targetZ - z) * 2.6 + Math.abs(dx) / Math.max(dt, 1e-3)
      const run = Math.min(speed * 0.8, 1)
      b.position.set(x, 0.02 + Math.abs(Math.sin(t * 13 + d.bob)) * 0.045 * run, PLANE_Z + nz)
      b.rotation.y = Math.atan2(dx, nz - z + 1e-4)
      // ortho: a piper working the far edge of the beach has to be shrunk by
      // hand, or it reads as the same bird standing at your feet
      const s = d.size * show * (1 - 0.45 * distanceOut(nz))
      b.scale.setScalar(s <= 0.01 ? 0.0001 : s)
    }
  })

  return (
    <group ref={flock}>
      {birds.map((_, i) => (
        <group key={i}>
          <mesh position={[0, 0.19, 0]} scale={[0.9, 1, 1.5]}>
            <sphereGeometry args={[0.15, 10, 8]} />
            <meshLambertMaterial color={plumage} />
          </mesh>
          <mesh position={[0, 0.32, 0.17]}>
            <sphereGeometry args={[0.08, 8, 6]} />
            <meshLambertMaterial color={plumage} />
          </mesh>
          <mesh position={[0, 0.31, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.02, 0.14, 5]} />
            <meshLambertMaterial color={plumage} />
          </mesh>
          {[-0.05, 0.05].map((lx) => (
            <mesh key={lx} position={[lx, 0.06, 0]}>
              <cylinderGeometry args={[0.012, 0.012, 0.13, 4]} />
              <meshLambertMaterial color={plumage} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  )
}

// Some tides carry a sail on the horizon, hull-down in the far swell.
function Sail() {
  const world = useSeed((s) => s.world)
  const ref = useRef<Group>(null)

  const sail = useMemo(() => {
    const rng = mulberry32(hashSeed(world.seed) ^ 0x5a1e)
    const present =
      rng() < TUNING.life.sailChance &&
      world.timeOfDay !== 'night' &&
      world.weather !== 'rain' &&
      world.weather !== 'snow'
    return present
      ? { x0: rng() * 56, dir: rng() < 0.5 ? -1 : 1, speed: 0.04 + rng() * 0.035, bob: rng() * Math.PI * 2 }
      : null
  }, [world])

  const tone = useMemo(() => mixHex(world.palette.ink, world.palette.water, 0.45), [world])

  useFrame((state) => {
    const g = ref.current
    if (!g || !sail) return
    const t = state.clock.elapsedTime
    g.position.x = -30 + ((((sail.x0 + t * sail.speed * sail.dir) % 60) + 60) % 60)
    g.position.y = 0.35 + Math.sin(t * 0.45 + sail.bob) * 0.12
    g.rotation.z = Math.sin(t * 0.4 + sail.bob) * 0.03
  })

  if (!sail) return null
  return (
    <group ref={ref} position={[0, 0.35, PLANE_Z - 26.5]}>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.6, 0.14, 0.14]} />
        <meshLambertMaterial color={tone} />
      </mesh>
      <mesh position={[0.02, 0.8, 0]} scale={[1, 1, 0.24]}>
        <coneGeometry args={[0.26, 1.15, 3]} />
        <meshLambertMaterial color={tone} />
      </mesh>
    </group>
  )
}

// Fish that breach: an arc out of the water and back, with a ring where they
// leave and another where they land. Never in rain or snow — a churned
// surface would swallow the whole gesture.
type Jump = {
  t0: number
  x0: number
  x1: number
  depth: number
  peak: number
  dur: number
  gap: number
}

function JumpingFish() {
  const world = useSeed((s) => s.world)
  const group = useRef<Group>(null)

  const fish = useMemo(() => {
    if (world.weather === 'rain' || world.weather === 'snow') return []
    const rng = mulberry32(hashSeed(world.seed) ^ 0x1a5b)
    const n = TUNING.life.jumpingFish.min + Math.floor(rng() * TUNING.life.jumpingFish.extra)
    return Array.from({ length: n }, () => ({ rng, state: null as Jump | null, stagger: rng() * 8 }))
  }, [world])

  const tone = useMemo(() => mixHex(world.palette.water, world.palette.ink, 0.6), [world])
  const foam = world.palette.foam

  const roll = (rng: () => number, t: number): Jump => {
    const x0 = -17 + rng() * 34
    const span = (1.4 + rng() * 1.8) * (rng() < 0.5 ? -1 : 1)
    return {
      t0: t,
      x0,
      x1: x0 + span,
      depth: 3.5 + rng() * 9,
      peak: 1.4 + rng() * 1.1,
      dur: 0.95 + rng() * 0.45,
      gap: TUNING.life.jumpGap.min + rng() * TUNING.life.jumpGap.extra,
    }
  }

  useFrame((state) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const shore = shoreZ()
    for (let i = 0; i < fish.length; i++) {
      const f = fish[i]
      const node = g.children[i]
      if (!node) continue
      const [body, ringOut, ringIn] = node.children
      if (!f.state) {
        if (t < f.stagger) {
          body.visible = ringOut.visible = ringIn.visible = false
          continue
        }
        f.state = roll(f.rng, t)
      }
      const j = f.state
      const u = (t - j.t0) / j.dur
      if (u > 1 + j.gap / j.dur) {
        f.state = roll(f.rng, t)
        continue
      }
      const z = PLANE_Z + seawardZ(shore, j.depth, 1.0)
      // the arc
      if (u >= 0 && u <= 1) {
        const y = j.peak * 4 * u * (1 - u)
        body.visible = true
        body.position.set(j.x0 + (j.x1 - j.x0) * u, y, z)
        body.rotation.z = Math.atan2(j.peak * 4 * (1 - 2 * u), (j.x1 - j.x0) * 2.2)
        body.rotation.y = j.x1 > j.x0 ? 0 : Math.PI
      } else {
        body.visible = false
      }
      // rings: one where it left, one where it lands
      const ring = (node2: (typeof node)['children'][number], at: number, x: number) => {
        const a = (t - (j.t0 + at * j.dur)) / 0.55
        if (a < 0 || a > 1) {
          node2.visible = false
          return
        }
        node2.visible = true
        node2.position.set(x, 0.03, z)
        const s = 0.25 + a * 1.15
        node2.scale.set(s, s, 1)
        const m = (node2 as Mesh).material as MeshLambertMaterial
        m.opacity = 0.6 * (1 - a)
      }
      ring(ringOut, 0, j.x0)
      ring(ringIn, 1, j.x1)
    }
  })

  if (fish.length === 0) return null
  return (
    <group ref={group}>
      {fish.map((_, i) => (
        <group key={i}>
          <group scale={1.7}>
            <mesh scale={[0.42, 0.19, 0.15]}>
              <sphereGeometry args={[1, 10, 8]} />
              <meshLambertMaterial color={tone} />
            </mesh>
            <mesh position={[-0.46, 0, 0]} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 0.35]}>
              <coneGeometry args={[0.19, 0.3, 6]} />
              <meshLambertMaterial color={tone} />
            </mesh>
          </group>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.72, 1, 22]} />
            <meshLambertMaterial color={foam} transparent opacity={0} depthWrite={false} />
          </mesh>
          <mesh rotation-x={-Math.PI / 2}>
            <ringGeometry args={[0.72, 1, 22]} />
            <meshLambertMaterial color={foam} transparent opacity={0} depthWrite={false} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

// Ice: some snow tides carry floes, drifting shoreward-parallel and staying
// offshore as the water retreats (they float — the tide takes them with it).
function Icebergs() {
  const world = useSeed((s) => s.world)
  const group = useRef<Group>(null)

  const floes = useMemo(() => {
    if (world.weather !== 'snow') return []
    const rng = mulberry32(hashSeed(world.seed) ^ 0x1ce8)
    if (rng() > TUNING.life.icebergChance) return []
    const n = TUNING.life.icebergs.min + Math.floor(rng() * TUNING.life.icebergs.extra)
    return Array.from({ length: n }, () => ({
      x0: rng() * 46,
      dir: rng() < 0.5 ? -1 : 1,
      speed: 0.06 + rng() * 0.12,
      depth: 5 + rng() * 15,
      size: 0.5 + rng() * 1.5,
      squash: 0.35 + rng() * 0.4,
      spin: (rng() - 0.5) * 0.05,
      tilt: rng() * Math.PI,
      bob: rng() * Math.PI * 2,
    }))
  }, [world])

  const ice = useMemo(() => mixHex(world.palette.foam, world.palette.sky, 0.25), [world])

  useFrame((state) => {
    const g = group.current
    if (!g) return
    const t = state.clock.elapsedTime
    const shore = shoreZ()
    for (let i = 0; i < floes.length; i++) {
      const f = floes[i]
      const n = g.children[i]
      if (!n) continue
      const z = seawardZ(shore, f.depth, Math.min(f.size, 1.4))
      n.position.set(
        -23 + ((((f.x0 + t * f.speed * f.dir) % 46) + 46) % 46),
        -0.12 * f.size + Math.sin(t * 0.5 + f.bob) * 0.05,
        PLANE_Z + z,
      )
      n.rotation.y = f.tilt + t * f.spin
      n.rotation.z = Math.sin(t * 0.4 + f.bob) * 0.04
      // ortho camera: floes must be shrunk by hand to read as further out
      const s = f.size * (1 - 0.5 * seaDistance(shore, z))
      n.scale.set(s, s * f.squash, s * 0.8)
    }
  })

  if (floes.length === 0) return null
  return (
    <group ref={group}>
      {floes.map((_, i) => (
        <mesh key={i}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshLambertMaterial color={ice} flatShading />
        </mesh>
      ))}
    </group>
  )
}

export function Life() {
  return (
    <>
      <Sandpipers />
      <Sail />
      <JumpingFish />
      <Icebergs />
    </>
  )
}
