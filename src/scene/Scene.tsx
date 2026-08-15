import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useSeed } from '../seed/useSeed'
import { staticMode } from '../lib/motion'
import { Water } from './Water'
import { Wrack } from './Specimen'
import { Beach } from './Beach'

// Orthographic three-quarter view. Shoreline runs across the lower third;
// horizon sits near the top. Scroll drives the waterline (lib/scroll.ts).
function Rig() {
  const camera = useThree((s) => s.camera)
  useEffect(() => {
    camera.lookAt(0, 0, 2)
    camera.updateProjectionMatrix()
  }, [camera])
  return null
}

// Static composition: frameloop is 'demand', so poke a few renders through —
// one immediately, then again once fonts/layout and object placement settle.
function StaticKick() {
  const invalidate = useThree((s) => s.invalidate)
  const world = useSeed((s) => s.world)
  useEffect(() => {
    invalidate()
    const t1 = window.setTimeout(invalidate, 120)
    const t2 = window.setTimeout(invalidate, 700)
    return () => {
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [invalidate, world])
  return null
}

// Mobile GPU budget: cap devicePixelRatio lower on small screens
const DPR: [number, number] = window.innerWidth < 700 ? [0.75, 1.25] : [1, 1.75]

export function Scene() {
  const sky = useSeed((s) => s.world.palette.sky)
  return (
    <Canvas
      orthographic
      flat
      dpr={DPR}
      frameloop={staticMode ? 'demand' : 'always'}
      camera={{ position: [0, 10, 14], zoom: 26, near: -80, far: 200 }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <color attach="background" args={[sky]} />
      <Rig />
      {staticMode && <StaticKick />}
      <Water />
      <Beach />
      <Wrack />
    </Canvas>
  )
}
