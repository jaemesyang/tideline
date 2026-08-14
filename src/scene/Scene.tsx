import { useEffect } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useSeed } from '../seed/useSeed'
import { Water } from './Water'
import { Wrack } from './Specimen'

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

export function Scene() {
  const sky = useSeed((s) => s.world.palette.sky)
  return (
    <Canvas
      orthographic
      dpr={[1, 1.75]}
      camera={{ position: [0, 10, 14], zoom: 26, near: -80, far: 200 }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <color attach="background" args={[sky]} />
      <Rig />
      <Water />
      <Wrack />
    </Canvas>
  )
}
