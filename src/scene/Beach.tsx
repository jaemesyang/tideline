import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Color, Matrix4, Quaternion, Vector3, type InstancedMesh } from 'three'
import { useSeed } from '../seed/useSeed'
import { shoreZ } from '../lib/scroll'
import { mixHex } from '../lib/palettes'
import type { TimeOfDay } from '../lib/palettes'

// Lighting + the seeded small debris scattered on the sand (§5). Light rig is
// authored per time of day; colors come from the palette so objects sit in
// the same world as the shader.

const RIG: Record<TimeOfDay, { dir: [number, number, number]; dirI: number; hemiI: number }> = {
  dawn: { dir: [-8, 4, 6], dirI: 0.85, hemiI: 0.9 },
  overcast: { dir: [0, 10, 4], dirI: 0.45, hemiI: 1.05 },
  afternoon: { dir: [6, 9, 3], dirI: 1.0, hemiI: 0.95 },
  dusk: { dir: [8, 3, 5], dirI: 0.7, hemiI: 0.75 },
  night: { dir: [-4, 7, -2], dirI: 0.45, hemiI: 0.62 },
}

const PLANE_Z = 8
const DEBRIS_SUBMERGED = -0.6

const m4 = new Matrix4()
const pos = new Vector3()
const quat = new Quaternion()
const scl = new Vector3()
const yAxis = new Vector3(0, 1, 0)

export function Beach() {
  const world = useSeed((s) => s.world)
  const size = useThree((s) => s.size)
  const inst = useRef<InstancedMesh>(null)
  const rig = RIG[world.timeOfDay]
  const debris = world.sand.debris
  const xHalf = Math.min(22, size.width / (2 * 26) - 1)

  useEffect(() => {
    const mesh = inst.current
    if (!mesh) return
    const c = new Color(mixHex(world.palette.sand, world.palette.ink, 0.3))
    for (let i = 0; i < debris.length; i++) mesh.setColorAt(i, c)
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [world, debris])

  useFrame(() => {
    const mesh = inst.current
    if (!mesh) return
    const shore = shoreZ()
    for (let i = 0; i < debris.length; i++) {
      const d = debris[i]
      const z = 22 - d.y * 42 // shader-space, spread across the whole beach
      const t = Math.min(Math.max((z + 0.5 - shore) / 2, 0), 1)
      const e = t * t * (3 - 2 * t)
      const restY = 0.015
      pos.set(-xHalf + d.x * 2 * xHalf, DEBRIS_SUBMERGED + (restY - DEBRIS_SUBMERGED) * e, PLANE_Z + z)
      quat.setFromAxisAngle(yAxis, d.rotation)
      const s = 0.06 + d.size * 0.12
      scl.set(s, s * 0.4, s)
      mesh.setMatrixAt(i, m4.compose(pos, quat, scl))
    }
    mesh.instanceMatrix.needsUpdate = true
  })

  return (
    <>
      <hemisphereLight args={[world.palette.sky, world.palette.sand, rig.hemiI]} />
      <directionalLight position={rig.dir} color={world.palette.foam} intensity={rig.dirI} />
      <instancedMesh key={world.seed} ref={inst} args={[undefined, undefined, debris.length]}>
        <dodecahedronGeometry args={[1, 0]} />
        <meshLambertMaterial />
      </instancedMesh>
    </>
  )
}
