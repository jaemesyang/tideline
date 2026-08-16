import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Mesh, type OrthographicCamera, type ShaderMaterial } from 'three'
import { useSeed } from '../seed/useSeed'
import { mulberry32, hashSeed } from '../seed/mulberry32'
import { mixHex } from '../lib/palettes'
import { staticMode, STATIC_TIME } from '../lib/motion'
import { TUNING } from '../tuning'
import { deriveEasters } from '../lib/easters'

// Screen-space atmosphere on one camera-facing quad: a seeded cloud bank
// hugging the horizon, plus falling rain streaks or drifting snow when the
// tide's weather calls for them. Pure ALU, three unrolled layers each.

const vert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const frag = /* glsl */ `
uniform float uTime;
uniform float uMode; // 0 = none, 1 = rain, 2 = snow
uniform vec3 uColor;
uniform float uAspect;
uniform float uCover; // cloud coverage 0..1
uniform vec3 uCloudCol;
uniform float uCloudOff;
uniform float uHorizon; // uv-y of the horizon line
uniform float uStar; // shooting star (rare easter egg): 0 or 1
// distant headland: x = where it meets the water (uv, aspect-scaled),
// y = reach across the frame (signed: negative runs left), z = height, 0 = none
uniform vec3 uLand;
uniform vec3 uLandCol;
varying vec2 vUv;

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float vnoise(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float rainL(vec2 uv, float t, float n, float speed, float slant, float alpha) {
  uv.x += uv.y * slant;
  uv.y += t * speed;
  vec2 c = vec2(uv.x * n, uv.y * n * 0.25); // tall cells: streaks, not dots
  vec2 id = floor(c);
  vec2 f = fract(c);
  float h = hash21(id);
  float cx = 0.2 + 0.6 * fract(h * 13.7);
  float streak = (1.0 - smoothstep(0.0, 0.07, abs(f.x - cx))) *
    smoothstep(0.0, 0.25, f.y) * smoothstep(1.0, 0.55, f.y);
  return step(0.75, h) * streak * alpha;
}

float snowL(vec2 uv, float t, float n, float speed, float drift, float r, float alpha) {
  uv.y += t * speed;
  uv.x += sin(t * 0.5 + uv.y * 4.0) * drift;
  vec2 id = floor(uv * n);
  vec2 f = fract(uv * n) - 0.5;
  float h = hash21(id);
  vec2 o = (vec2(fract(h * 7.31), fract(h * 3.17)) - 0.5) * 0.55;
  return step(0.8, h) * alpha * smoothstep(r, r * 0.25, length(f - o));
}

void main() {
  vec2 uv = vec2(vUv.x * uAspect, vUv.y);
  float t = uTime;

  // cloud bank above the horizon: stretched fbm, slow drift
  vec2 cp = vec2(uv.x * 3.2 + t * 0.006 + uCloudOff, vUv.y * 22.0);
  float cl = 0.55 * vnoise(cp) + 0.3 * vnoise(cp * 2.1 + 5.0) + 0.15 * vnoise(cp * 4.3 + 9.0);
  float band = smoothstep(uHorizon - 0.012, uHorizon + 0.05, vUv.y);
  float ca = smoothstep(1.0 - uCover - 0.24, 1.0 - uCover + 0.24, cl) * 0.5 * band;

  // Distant headland. Land beyond the water, so it is drawn from the horizon
  // upward and never over the sea — it gives the far field something to be
  // instead of a bare gradient. Two smooth humps and a taper, no hashing.
  float la = 0.0;
  if (uLand.z > 0.001) {
    // run: 0 at the frame edge the land runs off, 1 at the point where it
    // enters the sea. It has to be tallest at the edge and dive to nothing at
    // the point — the other way round drew a flat-topped slab.
    float run = clamp((uv.x - uLand.x) / uLand.y, 0.0, 1.0);
    float taper = pow(1.0 - run, 1.5);
    float ridge = 0.70 + 0.30 * sin(run * 4.1 + 1.3) * sin(run * 1.7 + 0.4);
    float top = uHorizon + uLand.z * taper * ridge;
    // Its base overlaps the waterline by a hair. Starting exactly at uHorizon
    // left a sliver of sky under it and the whole thing floated.
    la = smoothstep(top + 0.003, top - 0.003, vUv.y) *
      smoothstep(uHorizon - 0.014, uHorizon - 0.006, vUv.y);
  }

  float a = 0.0;
  if (uMode > 0.5 && uMode < 1.5) {
    a += rainL(uv, t, 15.0, 1.3, 0.12, 0.30);
    a += rainL(uv, t, 23.0, 1.0, 0.09, 0.22);
    a += rainL(uv, t, 33.0, 0.75, 0.14, 0.14);
  } else if (uMode >= 1.5) {
    a += snowL(uv, t, 9.0, 0.05, 0.020, 0.20, 0.55);
    a += snowL(uv, t, 15.0, 0.075, 0.030, 0.16, 0.42);
    a += snowL(uv, t, 23.0, 0.105, 0.040, 0.13, 0.30);
  }
  a = clamp(a, 0.0, 0.85);

  // headland under the clouds, precip over both
  float baseA = la + ca * (1.0 - la);
  vec3 baseCol = baseA > 0.001 ? (uLandCol * la + uCloudCol * ca * (1.0 - la)) / baseA : uCloudCol;
  float outA = a + baseA * (1.0 - a);
  vec3 outCol = outA > 0.001 ? (uColor * a + baseCol * baseA * (1.0 - a)) / outA : uColor;

  // shooting star: one streak every ~40s, drawn above the horizon only
  if (uStar > 0.5) {
    float cyc = 40.0;
    float k = floor(t / cyc);
    float u = fract(t / cyc) * cyc; // seconds into this cycle
    float life = 1.1;
    if (u < life) {
      float p = u / life;
      float sx = 0.1 + hash21(vec2(k, 3.0)) * 0.8 * uAspect;
      float sy = uHorizon + 0.10 + hash21(vec2(k, 7.0)) * 0.16;
      vec2 dir = normalize(vec2(0.82, -0.34));
      vec2 head = vec2(sx, sy) + dir * p * 0.55 * uAspect;
      // distance to the tail segment behind the head
      vec2 d = uv - head;
      float along = clamp(dot(d, -dir), 0.0, 0.16);
      float perp = length(d + dir * along);
      float streak = smoothstep(0.006, 0.0, perp) * (1.0 - along / 0.16);
      float fade = smoothstep(0.0, 0.12, p) * smoothstep(1.0, 0.55, p);
      float sa = streak * fade * step(uHorizon, vUv.y);
      outCol = mix(outCol, vec3(1.0), outA > 0.001 ? sa : 1.0);
      outA = outA + sa * (1.0 - outA);
    }
  }

  gl_FragColor = vec4(outCol, outA);
}
`

function srgb(hex: string): Vector3 {
  const n = parseInt(hex.slice(1), 16)
  return new Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

const camDir = new Vector3()

// horizon sits ~365px above viewport center (see index.css sky gradient)
const HORIZON_PX = 365

export function Precipitation() {
  const world = useSeed((s) => s.world)
  const size = useThree((s) => s.size)
  const camera = useThree((s) => s.camera)
  const mesh = useRef<Mesh>(null)
  const mat = useRef<ShaderMaterial>(null)

  const mode = world.weather === 'rain' ? 1 : world.weather === 'snow' ? 2 : 0
  const star = useMemo(() => deriveEasters(world).shootingStar, [world])

  // Some coasts have another headland in sight. Decorative stream — a new tag,
  // so deriveWorld's draw order is untouched.
  const land = useMemo(() => {
    const rng = mulberry32(hashSeed(world.seed) ^ 0x1a4d)
    if (rng() > 0.45) return null
    const aspect = size.width / size.height
    const left = rng() < 0.5
    const reach = (0.3 + rng() * 0.3) * aspect
    return {
      x: left ? 0 : aspect, // the frame edge the land runs off
      run: left ? reach : -reach,
      height: 0.022 + rng() * 0.030,
      // hazed hard: it is the furthest thing in the frame
      col: mixHex(world.palette.sky, world.palette.ink, world.timeOfDay === 'night' ? 0.28 : 0.2),
    }
  }, [world, size])

  const cloud = useMemo(() => {
    const rng = mulberry32(hashSeed(world.seed) ^ 0xc10d)
    const base = TUNING.clouds.cover[world.weather] ?? 0.3
    const cover =
      Math.max(base, world.timeOfDay === 'overcast' ? TUNING.clouds.overcastTime : 0) + (rng() - 0.5) * 0.16
    const night = world.timeOfDay === 'night'
    let col = mixHex(world.palette.sky, world.palette.foam, night ? 0.16 : 0.42)
    if (world.weather === 'rain' || world.weather === 'snow') col = mixHex(col, world.palette.ink, 0.14)
    return { cover: Math.max(0, Math.min(0.9, cover)), col, off: rng() * 40 }
  }, [world])

  const uniforms = useMemo(
    () => ({
      uTime: { value: staticMode ? STATIC_TIME : 0 },
      uMode: { value: mode },
      // rain reads as a mid-tone on any ground; snow stays near the foam white
      uColor: {
        value: srgb(mode === 1 ? mixHex(world.palette.foam, world.palette.ink, 0.45) : world.palette.foam),
      },
      uAspect: { value: size.width / size.height },
      uCover: { value: cloud.cover },
      uCloudCol: { value: srgb(cloud.col) },
      uCloudOff: { value: cloud.off },
      uHorizon: { value: 0.5 + HORIZON_PX / size.height },
      uStar: { value: star ? 1 : 0 },
      uLand: { value: new Vector3(land?.x ?? 0, land?.run ?? 1, land?.height ?? 0) },
      uLandCol: { value: srgb(land?.col ?? world.palette.sky) },
    }),
    [world, mode, size, cloud, star, land],
  )

  useFrame((state) => {
    const m = mesh.current
    if (!m) return
    camera.getWorldDirection(camDir)
    m.position.copy(camera.position).addScaledVector(camDir, 6)
    m.quaternion.copy(camera.quaternion)
    if (mat.current && !staticMode) mat.current.uniforms.uTime.value = state.clock.elapsedTime
  })

  if (mode === 0 && cloud.cover <= 0.01 && !star && !land) return null
  const zoom = (camera as OrthographicCamera).zoom || 26
  return (
    <mesh ref={mesh} renderOrder={30}>
      <planeGeometry args={[size.width / zoom + 2, size.height / zoom + 2]} />
      <shaderMaterial
        key={`${world.seed}-${mode}-${star}-${land ? 1 : 0}-${size.width}x${size.height}`}
        ref={mat}
        vertexShader={vert}
        fragmentShader={frag}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
