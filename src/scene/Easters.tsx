import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Color,
  Matrix4,
  Quaternion,
  Vector3,
  type Group,
  type InstancedMesh,
  type Mesh,
  type MeshBasicMaterial,
} from 'three'
import { useSeed } from '../seed/useSeed'
import { mulberry32, hashSeed } from '../seed/mulberry32'
import { mixHex } from '../lib/palettes'
import { shoreZ, seawardZ, distanceOut, seaDistance } from '../lib/scroll'
import { deriveEasters } from '../lib/easters'

// Hidden things. Each is an independent per-tide chance (rates in
// tuning.ts → easters), from "you'll see a crab most visits" down to a rubber
// duck roughly one tide in forty. Nothing here is announced in the UI.
//
// Which eggs a tide carries is decided in lib/easters.ts; this file only
// draws them.

const PLANE_Z = 8
const DEEP = '#12171b' // always-dark reference; `ink` inverts by palette

const m4 = new Matrix4()
const vPos = new Vector3()
const vScl = new Vector3()
const qRot = new Quaternion()
const yAxis = new Vector3(0, 1, 0)

// --- crab: works the sand above the waterline, in sideways bursts ---------
function Crab({ seed, tone }: { seed: string; tone: string }) {
  const g = useRef<Group>(null)
  const x = useRef(0)
  const cfg = useMemo(() => {
    const rng = mulberry32(hashSeed(seed) ^ 0xc4ab)
    return { x0: -10 + rng() * 20, off: 2.5 + rng() * 4, phase: rng() * 6.28, dir: rng() < 0.5 ? -1 : 1 }
  }, [seed])

  useFrame((state, dt) => {
    const grp = g.current
    if (!grp) return
    const t = state.clock.elapsedTime
    // scuttle in bursts, pause between
    const burst = Math.max(0, Math.sin(t * 0.7 + cfg.phase))
    x.current += burst * burst * 2.6 * cfg.dir * Math.min(dt, 0.05)
    const shore = shoreZ()
    const px = cfg.x0 + ((((x.current + 22) % 44) + 44) % 44) - 22
    const z = shore + cfg.off
    grp.position.set(px, 0.06 + burst * 0.02, PLANE_Z + z)
    grp.visible = shore < 14 // only once there is dry sand to work
    grp.scale.setScalar(0.9 * (1 - 0.45 * distanceOut(z))) // ortho fake perspective
    // legs paddle while moving
    for (let i = 0; i < grp.children.length; i++) {
      const c = grp.children[i]
      if (c.userData.leg !== undefined) {
        c.rotation.x = Math.sin(t * 14 + c.userData.leg) * 0.5 * burst
      }
    }
  })

  return (
    <group ref={g}>
      <mesh scale={[0.3, 0.13, 0.24]}>
        <sphereGeometry args={[1, 10, 8]} />
        <meshLambertMaterial color={tone} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={`claw${s}`} position={[s * 0.3, 0.02, 0.18]} scale={[0.12, 0.07, 0.16]}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshLambertMaterial color={tone} />
        </mesh>
      ))}
      {[-1, 1].map((s) =>
        [0, 1, 2].map((i) => (
          <mesh
            key={`leg${s}${i}`}
            position={[s * 0.26, -0.02, 0.1 - i * 0.12]}
            rotation={[0, 0, s * 0.5]}
            userData={{ leg: i * 2 + (s > 0 ? 1 : 0) }}
          >
            <boxGeometry args={[0.22, 0.025, 0.025]} />
            <meshLambertMaterial color={tone} />
          </mesh>
        )),
      )}
    </group>
  )
}

// --- footprints: someone crossed before the tide turned ------------------
function Footprints({ seed, tone }: { seed: string; tone: string }) {
  const inst = useRef<InstancedMesh>(null)
  const marks = useMemo(() => {
    const rng = mulberry32(hashSeed(seed) ^ 0xf007)
    const n = 14 + Math.floor(rng() * 8)
    const x0 = -14 + rng() * 12
    const z0 = 20 + rng() * 3
    const dx = 0.9 + rng() * 0.5
    const dz = -(1.5 + rng() * 0.9)
    const side = 0.42
    return Array.from({ length: n }, (_, i) => ({
      x: x0 + dx * i + (i % 2 ? side : -side),
      z: z0 + dz * i * 0.55,
      rot: Math.atan2(dx, -dz) + (rng() - 0.5) * 0.2,
      s: 0.9 + rng() * 0.25,
    })).filter((m) => m.z > -6)
  }, [seed])

  useFrame(() => {
    const mesh = inst.current
    if (!mesh) return
    const shore = shoreZ()
    for (let i = 0; i < marks.length; i++) {
      const m = marks[i]
      // only on sand the water has left; they wash away as the tide returns
      const e = Math.min(Math.max((m.z - 0.5 - shore) / 2.5, 0), 1)
      vPos.set(m.x, 0.012, PLANE_Z + m.z)
      qRot.setFromAxisAngle(yAxis, m.rot)
      vScl.set(0.17 * m.s * e, 0.02, 0.26 * m.s * e)
      mesh.setMatrixAt(i, m4.compose(vPos, qRot, vScl))
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  if (marks.length === 0) return null
  return (
    <instancedMesh ref={inst} args={[undefined, undefined, marks.length]}>
      <sphereGeometry args={[1, 8, 6]} />
      <meshLambertMaterial color={tone} />
    </instancedMesh>
  )
}

// --- whale: a back and a spout, far enough out to doubt you saw it -------
// It lives 21 out from the waterline, but the sea it lives in narrows as the
// tide runs out — seawardZ pins it inside the water rather than letting it
// sail off past the horizon. Under an ortho camera nothing shrinks with
// distance on its own, so the far-off read is faked the same way the shader
// fakes it: scale down and wash toward the sky as it goes out.
const WHALE_DEPTH = 21

type WhaleProps = {
  seed: string
  tone: string
  foam: string
  sky: string
  water: string
  bleed: number
}

function Whale({ seed, tone, foam, sky, water, bleed }: WhaleProps) {
  const g = useRef<Group>(null)
  const body = useRef<Group>(null)
  const back = useRef<Mesh>(null)
  const spout = useRef<Mesh>(null)
  const cfg = useMemo(() => {
    const rng = mulberry32(hashSeed(seed) ^ 0x3ba1)
    return { x0: rng() * 40, dir: rng() < 0.5 ? -1 : 1, period: 22 + rng() * 14, phase: rng() * 20 }
  }, [seed])

  const tint = useMemo(
    () => ({
      base: new Color(tone),
      foam: new Color(foam),
      sky: new Color(sky),
      // water.frag's `deepCol` — the shade the open water actually sits at
      deep: new Color(water).multiplyScalar(0.68),
    }),
    [tone, foam, sky, water],
  )
  const scratch = useMemo(() => new Color(), [])
  const sea = useMemo(() => new Color(), [])

  useFrame((state) => {
    const grp = g.current
    if (!grp || !body.current || !back.current || !spout.current) return
    const t = state.clock.elapsedTime
    const shore = shoreZ()
    const z = seawardZ(shore, WHALE_DEPTH, 1.6)
    grp.position.x = -22 + ((((cfg.x0 + t * 0.35 * cfg.dir) % 44) + 44) % 44)
    grp.position.z = PLANE_Z + z

    // surfacing cycle: mostly under, a slow arc up, a spout at the top
    const u = ((t + cfg.phase) % cfg.period) / cfg.period
    const up = u < 0.22 ? Math.sin((u / 0.22) * Math.PI) : 0
    grp.position.y = -0.85 + up * 0.85
    back.current.rotation.z = (0.5 - u / 0.22) * 0.4 * up
    const blow = u > 0.05 && u < 0.13 ? 1 - (u - 0.05) / 0.08 : 0
    spout.current.visible = blow > 0.02
    spout.current.scale.set(0.5 + blow * 0.5, 0.4 + blow * 1.5, 0.5 + blow * 0.5)

    // fake perspective + atmosphere, both keyed to how far out it actually is.
    // Haze toward the sea it is swimming in, not toward raw sky — the shader
    // only bleeds the water part-way to the sky, and going all the way turned
    // the whale into an orange smear on warm palettes.
    const out = seaDistance(shore, z)
    body.current.scale.setScalar(1 - 0.55 * out)
    sea.copy(tint.deep).lerp(tint.sky, bleed * out)
    const haze = 0.6 * out
    for (const [mesh, from] of [
      [back.current, tint.base],
      [spout.current, tint.foam],
    ] as const) {
      const m = mesh.material as MeshBasicMaterial
      m.color.copy(scratch.copy(from).lerp(sea, haze))
    }
  })

  return (
    <group ref={g}>
      {/* unlit: the sea around it is raw shader output that the light rig
          never touches, and a lit whale came out warm against cold water */}
      <group ref={body}>
        <mesh ref={back} scale={[2.6, 0.55, 0.85]}>
          <sphereGeometry args={[1, 14, 10]} />
          <meshBasicMaterial color={tone} />
        </mesh>
        <mesh ref={spout} position={[-1.1, 0.7, 0]}>
          <coneGeometry args={[0.18, 1.1, 8]} />
          <meshBasicMaterial color={foam} transparent opacity={0.75} />
        </mesh>
      </group>
    </group>
  )
}

// --- duck: roughly one tide in forty, and completely out of register -----
function Duck({ seed }: { seed: string }) {
  const g = useRef<Group>(null)
  const cfg = useMemo(() => {
    const rng = mulberry32(hashSeed(seed) ^ 0xd0c5)
    return { x: -12 + rng() * 24, off: 3 + rng() * 4, phase: rng() * 6.28 }
  }, [seed])

  useFrame((state) => {
    const grp = g.current
    if (!grp) return
    const t = state.clock.elapsedTime
    const shore = shoreZ()
    grp.position.set(
      cfg.x + Math.sin(t * 0.22 + cfg.phase) * 1.6,
      Math.sin(t * 1.5 + cfg.phase) * 0.09,
      PLANE_Z + seawardZ(shore, cfg.off, 0.6),
    )
    grp.rotation.z = Math.sin(t * 1.2 + cfg.phase) * 0.13
    grp.rotation.y = Math.sin(t * 0.3 + cfg.phase) * 0.5
  })

  return (
    <group ref={g} scale={0.5}>
      <mesh scale={[1, 0.8, 0.85]}>
        <sphereGeometry args={[0.5, 12, 10]} />
        <meshLambertMaterial color="#f2c531" />
      </mesh>
      <mesh position={[0.3, 0.42, 0]}>
        <sphereGeometry args={[0.27, 12, 10]} />
        <meshLambertMaterial color="#f2c531" />
      </mesh>
      <mesh position={[0.55, 0.38, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.24, 8]} />
        <meshLambertMaterial color="#e07a2c" />
      </mesh>
    </group>
  )
}

export function Easters() {
  const world = useSeed((s) => s.world)
  const eggs = useMemo(() => deriveEasters(world), [world])
  // `ink` flips light on the night/dusk palettes, so anything that must read
  // as a shadow or a depression mixes toward a fixed deep tone instead.
  const crabTone = useMemo(() => mixHex('#9c5a3c', world.palette.ink, 0.25), [world])
  const printTone = useMemo(() => mixHex(world.palette.sand, DEEP, 0.42), [world])
  const whaleTone = useMemo(() => mixHex(world.palette.water, DEEP, 0.6), [world])

  return (
    <>
      {eggs.crab && <Crab seed={world.seed} tone={crabTone} />}
      {eggs.footprints && <Footprints seed={world.seed} tone={printTone} />}
      {eggs.whale && (
        <Whale
          seed={world.seed}
          tone={whaleTone}
          foam={world.palette.foam}
          sky={world.palette.sky}
          water={world.palette.water}
          bleed={world.weather === 'haze' ? 0.9 : 0.55} // matches uHorizonBleed
        />
      )}
      {eggs.duck && <Duck seed={world.seed} />}
    </>
  )
}
