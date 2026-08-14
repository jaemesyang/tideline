import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { useSeed } from '../seed/useSeed'
import { shoreZ } from '../lib/scroll'

// Phase 3 placeholders: one flat ink box per wrack item, rising out of the
// sand as the waterline retreats past it. Real objects + labels are Phase 4.
// Positions use only values already drawn by deriveWorld — adding rng draws
// here would silently re-roll every existing tide.

const PLANE_Z = 8 // water plane's world-z offset; wrack z is authored in shader space
const BOX = 1.3
const SUBMERGED_Y = -1.1

// Exposure order is wrack order: first item highest on the beach (uncovered
// first), last item nearest the water's resting edge.
const Z_FIRST = 18
const Z_LAST = -16

function wrackZ(i: number, n: number): number {
  return n > 1 ? Z_FIRST + ((Z_LAST - Z_FIRST) * i) / (n - 1) : Z_FIRST
}

function restY(buriedDepth: number): number {
  return BOX / 2 - buriedDepth * 0.55
}

export function Wrack() {
  const wrack = useSeed((s) => s.world.wrack)
  const ink = useSeed((s) => s.world.palette.ink)
  const group = useRef<Group>(null)

  useFrame(() => {
    const g = group.current
    if (!g) return
    const shore = shoreZ()
    for (let i = 0; i < g.children.length; i++) {
      const item = wrack[i]
      if (!item) continue
      const z = wrackZ(i, wrack.length)
      // starts rising as the waterline reaches it, settled ~3 units later
      const t = Math.min(Math.max((z + 1 - shore) / 3, 0), 1)
      const e = t * t * (3 - 2 * t)
      g.children[i].position.y = SUBMERGED_Y + (restY(item.buriedDepth) - SUBMERGED_Y) * e
    }
  })

  return (
    <group ref={group}>
      {wrack.map((item, i) => (
        <mesh
          key={item.specimen.id}
          position={[-20 + item.x * 40, SUBMERGED_Y, PLANE_Z + wrackZ(i, wrack.length)]}
          rotation-y={item.rotation}
        >
          <boxGeometry args={[BOX, BOX, BOX]} />
          <meshBasicMaterial color={ink} />
        </mesh>
      ))}
    </group>
  )
}
