import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, Matrix4, Quaternion, Vector3, type Group, type InstancedMesh } from 'three'
import { useSeed } from '../seed/useSeed'
import { shoreZ } from '../lib/scroll'
import { mulberry32, hashSeed } from '../seed/mulberry32'
import { mixHex } from '../lib/palettes'
import { TUNING } from '../tuning'
import { RIG } from '../lib/lightRig'

// Lighting + the seeded small debris scattered on the sand (§5). Light rig is
// authored per time of day; colors come from the palette so objects sit in
// the same world as the shader.

const PLANE_Z = 8
const DEBRIS_SUBMERGED = -0.6

const m4 = new Matrix4()
const pos = new Vector3()
const quat = new Quaternion()
const scl = new Vector3()
const yAxis = new Vector3(0, 1, 0)

// Gulls: two or three, drifting over the surf on fair-weather daytime tides.
// Their own mulberry32 keyed off the seed — deterministic, and never touches
// deriveWorld's draw order.
function Birds() {
  const world = useSeed((s) => s.world)
  const flock = useRef<Group>(null)

  const birds = useMemo(() => {
    if (world.weather === 'rain' || world.weather === 'snow' || world.timeOfDay === 'night') return []
    const rng = mulberry32(hashSeed(world.seed) ^ 0x9e3d)
    const n = TUNING.life.gulls.min + Math.floor(rng() * TUNING.life.gulls.extra)
    return Array.from({ length: n }, () => ({
      x0: rng() * 60,
      y: 5.2 + rng() * 2.2,
      z: -14 + rng() * 5,
      speed: 0.5 + rng() * 0.45,
      dir: rng() < 0.5 ? -1 : 1,
      flap: 2 + rng() * 1.6,
      phase: rng() * Math.PI * 2,
      size: 0.3 + rng() * 0.18,
    }))
  }, [world])

  useFrame((state) => {
    const g = flock.current
    if (!g) return
    const t = state.clock.elapsedTime
    for (let i = 0; i < g.children.length; i++) {
      const d = birds[i]
      if (!d) continue
      const b = g.children[i]
      b.position.x = -30 + ((((d.x0 + t * d.speed * d.dir) % 60) + 60) % 60)
      b.position.y = d.y + Math.sin(t * 0.4 + d.phase) * 0.4
      const w = Math.sin(t * d.flap * Math.PI + d.phase) * 0.55
      b.children[0].rotation.z = 0.45 + w
      b.children[1].rotation.z = -0.45 - w
    }
  })

  if (birds.length === 0) return null
  return (
    <group ref={flock}>
      {birds.map((d, i) => (
        <group key={i} position={[0, d.y, d.z]} scale={d.size}>
          <group>
            <mesh position={[0.5, 0, 0]}>
              <boxGeometry args={[1, 0.06, 0.16]} />
              <meshBasicMaterial color={world.palette.ink} />
            </mesh>
          </group>
          <group>
            <mesh position={[-0.5, 0, 0]}>
              <boxGeometry args={[1, 0.06, 0.16]} />
              <meshBasicMaterial color={world.palette.ink} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

export function Beach() {
  const world = useSeed((s) => s.world)
  const size = useThree((s) => s.size)
  const inst = useRef<InstancedMesh>(null)
  const strandInst = useRef<InstancedMesh>(null)
  const rig = RIG[world.timeOfDay]
  const debris = world.sand.debris
  const xHalf = Math.min(22, size.width / (2 * 26) - 1)

  // the strand line: a band of dried kelp bits along the old high-water mark.
  // Decorative rng stream — deterministic, no deriveWorld draws touched.
  const strands = useMemo(() => {
    const rng = mulberry32(hashSeed(world.seed) ^ 0x57a4)
    const n = TUNING.life.strandPieces.min + Math.floor(rng() * TUNING.life.strandPieces.extra)
    return Array.from({ length: n }, () => {
      const x01 = rng()
      return {
        x01,
        z: 17.2 + rng() * 2.6 + Math.sin(x01 * 14) * 0.5,
        len: 0.35 + rng() * 0.75,
        rot: rng() < 0.8 ? (rng() - 0.5) * 0.7 : rng() * Math.PI,
        thick: 0.55 + rng() * 0.5,
      }
    })
  }, [world.seed])

  useEffect(() => {
    const mesh = inst.current
    if (!mesh) return
    const c = new Color(mixHex(world.palette.sand, world.palette.ink, 0.3))
    for (let i = 0; i < debris.length; i++) mesh.setColorAt(i, c)
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [world, debris])

  useEffect(() => {
    const mesh = strandInst.current
    if (!mesh) return
    const dark = new Color(mixHex(world.palette.ink, world.palette.sand, 0.35))
    const c = new Color()
    for (let i = 0; i < strands.length; i++) {
      mesh.setColorAt(i, c.copy(dark).multiplyScalar(0.85 + (i % 5) * 0.06))
    }
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [world, strands])

  useFrame(() => {
    const mesh = inst.current
    if (!mesh) return
    const shore = shoreZ()
    for (let i = 0; i < debris.length; i++) {
      const d = debris[i]
      const z = 22 - d.y * 42 // shader-space, spread across the whole beach
      // same transition window as the wrack: taken/released inside the water
      const t = Math.min(Math.max((z + 2.0 - shore) / 1.8, 0), 1)
      const e = t * t * (3 - 2 * t)
      const restY = 0.015
      pos.set(-xHalf + d.x * 2 * xHalf, DEBRIS_SUBMERGED + (restY - DEBRIS_SUBMERGED) * e, PLANE_Z + z)
      quat.setFromAxisAngle(yAxis, d.rotation)
      const s = 0.06 + d.size * 0.12
      scl.set(s, s * 0.4, s)
      mesh.setMatrixAt(i, m4.compose(pos, quat, scl))
    }
    mesh.instanceMatrix.needsUpdate = true

    const sm = strandInst.current
    if (!sm) return
    for (let i = 0; i < strands.length; i++) {
      const s = strands[i]
      const t = Math.min(Math.max((s.z + 2.0 - shore) / 1.8, 0), 1)
      const e = t * t * (3 - 2 * t)
      pos.set(-xHalf + s.x01 * 2 * xHalf, DEBRIS_SUBMERGED + (0.02 - DEBRIS_SUBMERGED) * e, PLANE_Z + s.z)
      quat.setFromAxisAngle(yAxis, s.rot)
      scl.set(s.len, 0.045, 0.09 * s.thick)
      sm.setMatrixAt(i, m4.compose(pos, quat, scl))
    }
    sm.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <hemisphereLight args={[world.palette.sky, world.palette.sand, rig.hemiI]} />
      <directionalLight position={rig.dir} color={world.palette.foam} intensity={rig.dirI} />
      <ambientLight color={world.palette.foam} intensity={0.22} />
      <Birds />
      <instancedMesh key={world.seed} ref={inst} args={[undefined, undefined, debris.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial />
      </instancedMesh>
      <instancedMesh key={`st-${world.seed}`} ref={strandInst} args={[undefined, undefined, strands.length]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshLambertMaterial />
      </instancedMesh>
    </>
  )
}
