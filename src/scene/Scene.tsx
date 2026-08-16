import { useEffect, useState } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { useSeed } from '../seed/useSeed'
import { staticMode } from '../lib/motion'
import { Water } from './Water'
import { Wrack } from './Specimen'
import { Beach } from './Beach'
import { Precipitation } from './Precipitation'
import { Life } from './Life'
import { Easters } from './Easters'

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

// Mobile GPU budget: cap devicePixelRatio lower on small screens. Re-picked on
// resize — deciding once at module load meant a window dragged across the
// threshold (or a tablet rotated) kept the wrong budget for the whole session.
const dprFor = (w: number): [number, number] => (w < 700 ? [0.75, 1.25] : [1, 1.75])

function useDpr(): [number, number] {
  const [dpr, setDpr] = useState(() => dprFor(window.innerWidth))
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 699px)')
    const sync = () => setDpr(dprFor(window.innerWidth))
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  return dpr
}

export function Scene() {
  const dpr = useDpr()
  // no solid background: the canvas is transparent above the water plane, so
  // the CSS sky gradient (horizon glow, see index.css) shows through
  return (
    <Canvas
      orthographic
      flat
      dpr={dpr}
      frameloop={staticMode ? 'demand' : 'always'}
      camera={{ position: [0, 10, 14], zoom: 26, near: -80, far: 200 }}
      style={{ position: 'fixed', inset: 0 }}
    >
      <Rig />
      {staticMode && <StaticKick />}
      <Water />
      <Beach />
      <Wrack />
      <Life />
      <Easters />
      <Precipitation />
    </Canvas>
  )
}
