import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, Euler, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three'
import { useSeed } from '../seed/useSeed'
import { mulberry32, hashSeed } from '../seed/mulberry32'
import { shoreZ, distanceOut } from '../lib/scroll'
import { TUNING } from '../tuning'

// The one seed's inhabitants: a crowd of wooden things with faces, hopping
// along the strandline. They are decoration only — the wrack, the labels and
// the résumé are untouched, so the beach still works as a beach underneath.
//
// Eleven parts per figure, so a crowd this size is drawn instanced: one
// InstancedMesh per part, each instance matrix being the figure's transform
// times a fixed local offset. Thirty-odd figures cost seven draw calls.

const PLANE_Z = 8

// --- one figure, in parts (local space, feet at y = 0) --------------------
type Part = {
  pos: [number, number, number]
  rot?: [number, number, number]
  scl?: [number, number, number]
}

const BODY: Part = { pos: [0, 1.05, 0] }
// the face sits high on the club and reads big — it is the whole joke
const EYES: Part[] = [
  { pos: [-0.2, 1.56, 0.3], scl: [1, 1.12, 0.6] },
  { pos: [0.2, 1.56, 0.3], scl: [1, 1.12, 0.6] },
]
const PUPILS: Part[] = [
  { pos: [-0.21, 1.55, 0.4], scl: [1, 1, 0.7] },
  { pos: [0.21, 1.55, 0.4], scl: [1, 1, 0.7] },
]
const MOUTH: Part = { pos: [0, 1.13, 0.32], scl: [1.5, 1.05, 0.45] }
const ARMS: Part[] = [
  { pos: [-0.5, 1.1, 0.02], rot: [0, 0, 1.0] },
  { pos: [0.52, 1.02, 0.04], rot: [0, 0, -1.3] },
]
const LEGS: Part[] = [
  { pos: [-0.17, 0.17, 0], rot: [0, 0, 0.07] },
  { pos: [0.17, 0.17, 0], rot: [0, 0, -0.07] },
]
const STICK: Part = { pos: [0.9, 0.82, 0.06], rot: [0, 0, -0.55] }

const localMatrix = (p: Part): Matrix4 =>
  new Matrix4().compose(
    new Vector3(...p.pos),
    new Quaternion().setFromEuler(new Euler(...(p.rot ?? [0, 0, 0]))),
    new Vector3(...(p.scl ?? [1, 1, 1])),
  )

const M = {
  body: localMatrix(BODY),
  eyes: EYES.map(localMatrix),
  pupils: PUPILS.map(localMatrix),
  mouth: localMatrix(MOUTH),
  arms: ARMS.map(localMatrix),
  legs: LEGS.map(localMatrix),
  stick: localMatrix(STICK),
}

const fig = new Matrix4()
const out = new Matrix4()
const vPos = new Vector3()
const vScl = new Vector3()
const qRot = new Quaternion()
const eRot = new Euler()

type Figure = {
  x0: number
  z: number
  size: number
  speed: number
  dir: 1 | -1
  hop: number
  phase: number
  spin: number
  hue: number
}

export function Carnival() {
  const world = useSeed((s) => s.world)
  const body = useRef<InstancedMesh>(null)
  const eye = useRef<InstancedMesh>(null)
  const pupil = useRef<InstancedMesh>(null)
  const mouth = useRef<InstancedMesh>(null)
  const arm = useRef<InstancedMesh>(null)
  const leg = useRef<InstancedMesh>(null)
  const stick = useRef<InstancedMesh>(null)

  const crowd = useMemo<Figure[]>(() => {
    if (!world.carnival) return []
    const rng = mulberry32(hashSeed(world.seed) ^ 0x5a40)
    const n = TUNING.carnival.crowd
    return Array.from({ length: n }, (_, i) => ({
      x0: rng() * 52,
      z: -16 + rng() * 40,
      size: 0.95 + rng() * (rng() < 0.14 ? 2.4 : 0.8), // a few of them are enormous
      speed: 0.5 + rng() * 2.2,
      dir: rng() < 0.5 ? -1 : 1,
      hop: 2.2 + rng() * 3.4,
      phase: rng() * 6.28,
      spin: (rng() - 0.5) * 3.2,
      hue: i / n + rng() * 0.06,
    }))
  }, [world])

  // rainbow bodies: one hue per figure, set once
  useEffect(() => {
    const b = body.current
    const s = stick.current
    if (!b || crowd.length === 0) return
    const c = new Color()
    for (let i = 0; i < crowd.length; i++) {
      c.setHSL(crowd[i].hue % 1, 0.72, 0.55)
      b.setColorAt(i, c)
      s?.setColorAt(i, c.offsetHSL(0, 0, -0.18))
    }
    if (b.instanceColor) b.instanceColor.needsUpdate = true
    if (s?.instanceColor) s.instanceColor.needsUpdate = true
  }, [crowd])

  useFrame((state) => {
    if (crowd.length === 0) return
    const t = state.clock.elapsedTime
    const shore = shoreZ()
    const meshes = [body.current, eye.current, pupil.current, mouth.current, arm.current, leg.current, stick.current]
    if (meshes.some((m) => !m)) return

    for (let i = 0; i < crowd.length; i++) {
      const f = crowd[i]
      // marching, wrapping around the width of the plane
      const x = -26 + ((((f.x0 + t * f.speed * f.dir) % 52) + 52) % 52)
      // a hop, and a lean into it
      const bounce = Math.abs(Math.sin(t * f.hop + f.phase))
      const inWater = f.z < shore
      const lift = inWater ? Math.sin(t * 1.6 + f.phase) * 0.12 - 0.25 : bounce * 0.42 * f.size
      // ortho camera: shrink the far ones by hand like everything else here
      const scale = f.size * (1 - 0.3 * distanceOut(f.z))

      eRot.set(bounce * 0.12, f.phase + t * f.spin, Math.sin(t * f.hop + f.phase) * 0.22)
      qRot.setFromEuler(eRot)
      vPos.set(x, lift, PLANE_Z + f.z)
      vScl.setScalar(scale)
      fig.compose(vPos, qRot, vScl)

      body.current!.setMatrixAt(i, out.multiplyMatrices(fig, M.body))
      mouth.current!.setMatrixAt(i, out.multiplyMatrices(fig, M.mouth))
      stick.current!.setMatrixAt(i, out.multiplyMatrices(fig, M.stick))
      for (let k = 0; k < 2; k++) {
        eye.current!.setMatrixAt(i * 2 + k, out.multiplyMatrices(fig, M.eyes[k]))
        pupil.current!.setMatrixAt(i * 2 + k, out.multiplyMatrices(fig, M.pupils[k]))
        arm.current!.setMatrixAt(i * 2 + k, out.multiplyMatrices(fig, M.arms[k]))
        leg.current!.setMatrixAt(i * 2 + k, out.multiplyMatrices(fig, M.legs[k]))
      }
    }
    for (const m of meshes) m!.instanceMatrix.needsUpdate = true
  })

  if (crowd.length === 0) return null
  const n = crowd.length
  return (
    <group>
      <instancedMesh ref={body} args={[undefined, undefined, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.33, 0.5, 1.7, 12]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh ref={eye} args={[undefined, undefined, n * 2]} frustumCulled={false}>
        <sphereGeometry args={[0.15, 12, 9]} />
        <meshLambertMaterial color="#fffdf6" />
      </instancedMesh>
      <instancedMesh ref={pupil} args={[undefined, undefined, n * 2]} frustumCulled={false}>
        <sphereGeometry args={[0.076, 9, 7]} />
        <meshLambertMaterial color="#150f18" />
      </instancedMesh>
      <instancedMesh ref={mouth} args={[undefined, undefined, n]} frustumCulled={false}>
        <sphereGeometry args={[0.22, 14, 9]} />
        <meshLambertMaterial color="#2a0e14" />
      </instancedMesh>
      <instancedMesh ref={arm} args={[undefined, undefined, n * 2]} frustumCulled={false}>
        <cylinderGeometry args={[0.05, 0.05, 0.66, 6]} />
        <meshLambertMaterial color="#8a5a2c" />
      </instancedMesh>
      <instancedMesh ref={leg} args={[undefined, undefined, n * 2]} frustumCulled={false}>
        <cylinderGeometry args={[0.062, 0.062, 0.36, 6]} />
        <meshLambertMaterial color="#8a5a2c" />
      </instancedMesh>
      <instancedMesh ref={stick} args={[undefined, undefined, n]} frustumCulled={false}>
        <cylinderGeometry args={[0.055, 0.085, 0.8, 7]} />
        <meshLambertMaterial />
      </instancedMesh>
    </group>
  )
}
