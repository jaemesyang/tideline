// One authored builder per ObjectKey. Primitives only, low poly, one JSX
// definition each — no seeded draws in here (a specimen looks like itself on
// every tide; only placement/rotation/bury come from the seed, drawn in
// deriveWorld). Everything is built lying down, washed-up, resting on y=0.
// Colors are authored constants, muted; the palette-keyed lights in Beach.tsx
// pull them into the scene.

import { CatmullRomCurve3, Vector2, Vector3 } from 'three'
import type { JSX } from 'react'
import type { ObjectKey } from '../content'

/** World-space y of each object's label anchor point (roughly its top). */
export const OBJECT_ANCHOR_Y: Record<ObjectKey, number> = {
  driftwood: 0.45,
  bottle: 0.6,
  glassFloat: 1.1,
  buoy: 0.85,
  net: 0.5,
  crate: 0.95,
  shell: 0.75,
  kelp: 0.35,
  rope: 0.55,
  canister: 0.95,
}

const v = (x: number, y: number, z: number) => new Vector3(x, y, z)

// sea-glass bottle, lying on its side
const bottleProfile = [
  new Vector2(0.001, 0),
  new Vector2(0.26, 0),
  new Vector2(0.29, 0.07),
  new Vector2(0.29, 0.78),
  new Vector2(0.24, 0.95),
  new Vector2(0.105, 1.08),
  new Vector2(0.095, 1.38),
  new Vector2(0.115, 1.41),
  new Vector2(0.095, 1.46),
  new Vector2(0.001, 1.46),
]

// tangled net bundle: two closed tube paths sharing a footprint
const netPathA = new CatmullRomCurve3(
  [
    v(-0.85, 0.1, 0.05),
    v(-0.3, 0.32, 0.35),
    v(0.3, 0.12, 0.45),
    v(0.8, 0.3, -0.05),
    v(0.35, 0.14, -0.42),
    v(-0.35, 0.3, -0.3),
  ],
  true,
)
const netPathB = new CatmullRomCurve3(
  [
    v(-0.7, 0.24, -0.2),
    v(-0.1, 0.1, 0.42),
    v(0.55, 0.28, 0.25),
    v(0.6, 0.1, -0.3),
    v(-0.1, 0.34, -0.12),
  ],
  true,
)

// loose rope end trailing off the coil
const ropeEnd = new CatmullRomCurve3([
  v(0.42, 0.12, 0.2),
  v(0.95, 0.08, 0.45),
  v(1.35, 0.05, 0.3),
  v(1.6, 0.05, 0.55),
])

const wood = '#97866f'
const crateWood = '#a08a64'
const glass = '#86a795'
const floatGlass = '#6d9a8e'
const ropeTan = '#b5a077'
const netTone = '#61705f'
const shellPale = '#ded4c5'
const kelpOlive = '#6b7a50'
const rustRed = '#8c6250'
const corkTone = '#9a7f5c'
const paperRoll = '#d8d1bf'
const buoyRed = '#a05f4d'
const buoyCream = '#d4cdbc'

export const OBJECT_BUILDERS: Record<ObjectKey, () => JSX.Element> = {
  driftwood: () => (
    <group>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.16, 0]}>
        <cylinderGeometry args={[0.1, 0.17, 2.3, 9]} />
        <meshLambertMaterial color={wood} />
      </mesh>
      <mesh position={[-0.5, 0.28, 0.12]} rotation={[0.4, 0, 1.9]}>
        <cylinderGeometry args={[0.035, 0.07, 0.8, 7]} />
        <meshLambertMaterial color={wood} />
      </mesh>
      <mesh position={[0.7, 0.2, -0.1]} rotation={[-0.5, 0, 1.2]}>
        <cylinderGeometry args={[0.025, 0.055, 0.55, 7]} />
        <meshLambertMaterial color={wood} />
      </mesh>
    </group>
  ),

  bottle: () => (
    <group rotation={[0, 0.35, 0]}>
      {/* rolled paper inside, visible through the glass */}
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.25, 0.28, 0]}>
        <cylinderGeometry args={[0.09, 0.09, 0.75, 10]} />
        <meshLambertMaterial color={paperRoll} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.62, 0.28, 0]}>
        <cylinderGeometry args={[0.085, 0.085, 0.16, 10]} />
        <meshLambertMaterial color={corkTone} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.73, 0.28, 0]} renderOrder={1}>
        <latheGeometry args={[bottleProfile, 18]} />
        <meshLambertMaterial color={glass} transparent opacity={0.72} />
      </mesh>
    </group>
  ),

  glassFloat: () => (
    <group>
      <mesh position={[0, 0.55, 0]} renderOrder={1}>
        <sphereGeometry args={[0.55, 24, 16]} />
        <meshLambertMaterial color={floatGlass} transparent opacity={0.8} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.555, 0.03, 6, 28]} />
        <meshLambertMaterial color={ropeTan} />
      </mesh>
      <mesh position={[0, 0.55, 0]} rotation={[0, 0.5, Math.PI / 2]}>
        <torusGeometry args={[0.555, 0.03, 6, 28]} />
        <meshLambertMaterial color={ropeTan} />
      </mesh>
    </group>
  ),

  buoy: () => (
    <group rotation={[0, 0, 0.28]}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.4, 0]}>
        <cylinderGeometry args={[0.38, 0.42, 1.1, 14]} />
        <meshLambertMaterial color={buoyRed} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.62, 0.4, 0]}>
        <cylinderGeometry args={[0.3, 0.38, 0.24, 14]} />
        <meshLambertMaterial color={buoyCream} />
      </mesh>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0.68, 0.4, 0]}>
        <coneGeometry args={[0.38, 0.5, 14]} />
        <meshLambertMaterial color={buoyRed} />
      </mesh>
    </group>
  ),

  net: () => (
    <group>
      <mesh>
        <tubeGeometry args={[netPathA, 48, 0.055, 5, true]} />
        <meshLambertMaterial color={netTone} />
      </mesh>
      <mesh rotation={[0, 1.1, 0]} scale={[0.9, 1.15, 0.9]}>
        <tubeGeometry args={[netPathB, 40, 0.05, 5, true]} />
        <meshLambertMaterial color={netTone} />
      </mesh>
      {/* cork floats caught in the mesh */}
      <mesh position={[-0.55, 0.35, 0.2]} rotation={[0.4, 0.3, 1.4]}>
        <cylinderGeometry args={[0.09, 0.09, 0.2, 8]} />
        <meshLambertMaterial color={corkTone} />
      </mesh>
      <mesh position={[0.5, 0.32, -0.25]} rotation={[1.2, 0, 0.4]}>
        <cylinderGeometry args={[0.09, 0.09, 0.2, 8]} />
        <meshLambertMaterial color={corkTone} />
      </mesh>
    </group>
  ),

  crate: () => (
    <group rotation={[0, 0, -0.06]}>
      {/* slatted sides */}
      {[-0.42, 0, 0.42].map((z) => (
        <mesh key={`b${z}`} position={[0, 0.09, z]}>
          <boxGeometry args={[1.5, 0.16, 0.24]} />
          <meshLambertMaterial color={crateWood} />
        </mesh>
      ))}
      {[-0.63, 0.63].map((x) =>
        [-0.42, 0.42].map((z) => (
          <mesh key={`p${x}${z}`} position={[x, 0.45, z]}>
            <boxGeometry args={[0.16, 0.9, 0.16]} />
            <meshLambertMaterial color={crateWood} />
          </mesh>
        )),
      )}
      {[0.32, 0.78].map((y) =>
        [-0.5, 0.5].map((z) => (
          <mesh key={`s${y}${z}`} position={[0, y, z]}>
            <boxGeometry args={[1.42, 0.18, 0.07]} />
            <meshLambertMaterial color={crateWood} />
          </mesh>
        )),
      )}
      {[0.32, 0.78].map((y) => (
        <mesh key={`e${y}`} position={[0.71, y, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[0.9, 0.18, 0.07]} />
          <meshLambertMaterial color={crateWood} />
        </mesh>
      ))}
    </group>
  ),

  shell: () => (
    // whelk: whorls shrinking along a lying axis, aperture hinted by a cone
    <group rotation={[0, 0, 0.15]} scale={1.15}>
      <mesh position={[0, 0.34, 0]} scale={[1, 0.92, 1]}>
        <sphereGeometry args={[0.38, 16, 12]} />
        <meshLambertMaterial color={shellPale} />
      </mesh>
      <mesh position={[0.38, 0.3, 0.03]} scale={[1, 0.9, 1]}>
        <sphereGeometry args={[0.26, 14, 10]} />
        <meshLambertMaterial color={shellPale} />
      </mesh>
      <mesh position={[0.64, 0.26, 0.05]}>
        <sphereGeometry args={[0.17, 12, 9]} />
        <meshLambertMaterial color={shellPale} />
      </mesh>
      <mesh position={[0.85, 0.24, 0.06]} rotation={[0, 0, -1.35]}>
        <coneGeometry args={[0.11, 0.34, 10]} />
        <meshLambertMaterial color={shellPale} />
      </mesh>
      <mesh position={[-0.28, 0.3, 0.08]} rotation={[0.5, 0.4, 1.75]}>
        <coneGeometry args={[0.16, 0.42, 10]} />
        <meshLambertMaterial color='#bfb2a0' />
      </mesh>
    </group>
  ),

  kelp: () => (
    <group>
      {[
        [0, 0.02, 0, 0.25],
        [0.28, 0.05, 0.3, -0.5],
        [-0.2, 0.04, -0.28, 0.9],
      ].map(([x, y, z, ry], i) => (
        <mesh key={i} position={[x, y, z]} rotation={[0, ry, 0.02]}>
          <boxGeometry args={[1.7, 0.045, 0.2]} />
          <meshLambertMaterial color={kelpOlive} />
        </mesh>
      ))}
      <mesh position={[0.85, 0.1, 0.05]}>
        <sphereGeometry args={[0.11, 10, 8]} />
        <meshLambertMaterial color={kelpOlive} />
      </mesh>
    </group>
  ),

  rope: () => (
    <group>
      {[
        [0.5, 0.1, 0, 0],
        [0.47, 0.24, 0.05, 0.5],
        [0.52, 0.38, -0.04, 1.1],
      ].map(([r, y, dx, rz], i) => (
        <mesh key={i} position={[dx, y, 0]} rotation={[Math.PI / 2, 0, rz]}>
          <torusGeometry args={[r, 0.085, 7, 26]} />
          <meshLambertMaterial color={ropeTan} />
        </mesh>
      ))}
      <mesh>
        <tubeGeometry args={[ropeEnd, 24, 0.07, 6, false]} />
        <meshLambertMaterial color={ropeTan} />
      </mesh>
    </group>
  ),

  canister: () => (
    // steel drum on its side, ribbed, rust-toned
    <group rotation={[0, 0, 0.04]}>
      <mesh rotation={[0, 0, Math.PI / 2]} position={[0, 0.46, 0]}>
        <cylinderGeometry args={[0.46, 0.46, 1.25, 18]} />
        <meshLambertMaterial color={rustRed} />
      </mesh>
      {[-0.3, 0.3].map((x) => (
        <mesh key={x} rotation={[0, Math.PI / 2, 0]} position={[x, 0.46, 0]}>
          <torusGeometry args={[0.47, 0.025, 6, 24]} />
          <meshLambertMaterial color='#8f6c58' />
        </mesh>
      ))}
    </group>
  ),
}
