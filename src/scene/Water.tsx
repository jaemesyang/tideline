import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Vector3, Vector4, type ShaderMaterial } from 'three'
import { useSeed } from '../seed/useSeed'
import { shoreZ, SHORE_IN } from '../lib/scroll'
import vert from '../shaders/water.vert'
import frag from '../shaders/water.frag'

const DEG = Math.PI / 180

// Raw sRGB components. three's Color would convert to linear, but our raw
// ShaderMaterial never re-encodes its output, so we do all math in sRGB.
function srgb(hex: string): Vector3 {
  const n = parseInt(hex.slice(1), 16)
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

export function Water() {
  const world = useSeed((s) => s.world)
  const mat = useRef<ShaderMaterial>(null)

  const uniforms = useMemo(() => {
    const [o1, o2] = world.water.gerstner
    // period draws double as wavelength (×1.4 world units) and temporal period (s)
    const octave = (o: typeof o1) =>
      [o.amplitude * 0.5, o.period * 1.4, 90 * DEG + o.directionDeg * DEG, o.phase] as const
    // three's array-uniform upload requires Vector4 instances, not plain arrays
    const swash = [0, 1, 2].map((i) => {
      const s = world.water.swash[i]
      return s
        ? new Vector4(s.runup * 4.5, (2 * Math.PI) / s.period, s.phase, s.noiseOffset)
        : new Vector4(0, 1, 0, 0)
    })
    return {
      uTime: { value: 0 },
      uOctave1: { value: octave(o1) },
      uOctave2: { value: octave(o2) },
      uOmega: { value: [(2 * Math.PI) / o1.period, (2 * Math.PI) / o2.period] },
      uShoreZ: { value: SHORE_IN },
      uWaterColor: { value: srgb(world.palette.water) },
      uSkyColor: { value: srgb(world.palette.sky) },
      uSandColor: { value: srgb(world.palette.sand) },
      uFoamColor: { value: srgb(world.palette.foam) },
      uFoamDensity: { value: world.water.foamDensity },
      uHorizonBleed: { value: world.weather === 'haze' ? 0.9 : 0.55 },
      uRain: { value: world.weather === 'rain' ? 1 : 0 },
      uGrainScale: { value: world.sand.grainScale },
      uSwashA: { value: swash[0] },
      uSwashB: { value: swash[1] },
      uSwashC: { value: swash[2] },
    }
  }, [world])

  useFrame((state) => {
    if (!mat.current) return
    mat.current.uniforms.uTime.value = state.clock.elapsedTime
    mat.current.uniforms.uShoreZ.value = shoreZ()
  })

  return (
    <mesh rotation-x={-Math.PI / 2} position={[0, 0, 8]}>
      <planeGeometry args={[110, 56, 192, 128]} />
      <shaderMaterial key={world.seed} ref={mat} vertexShader={vert} fragmentShader={frag} uniforms={uniforms} />
    </mesh>
  )
}
