import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  CanvasTexture,
  Color,
  Vector3,
  type Group,
  type Mesh,
  type MeshBasicMaterial,
  type MeshLambertMaterial,
} from 'three'
import { useSeed } from '../seed/useSeed'
import { shoreZ, tide } from '../lib/scroll'
import { staticMode } from '../lib/motion'
import { TUNING } from '../tuning'
import { OBJECT_BUILDERS, OBJECT_ANCHOR_Y } from './objects'
import { labelSlots, introEl, layerEl } from '../ui/labelBridge'

// Wrack objects + the label projector. One frame loop does everything:
// emergence (rise out of the sand as the waterline retreats past), wet-object
// tone fading dry, and projecting each object's anchor to screen space to
// place its DOM label card, resolve card overlaps, and draw leader lines.
// Positions use only values already drawn by deriveWorld — adding rng draws
// here would silently re-roll every existing tide.

const PLANE_Z = 8 // water plane's world-z offset; wrack z is authored in shader space
const SUBMERGED_Y = -3.0 // below the deepest wave trough, tallest object included
const BURY = 0.42 // world units at buriedDepth = 1

// Exposure order is wrack order: first item highest on the beach (uncovered
// first), last item nearest the water's resting edge.
const Z_FIRST = 18
const Z_LAST = -16

// Chrome keep-out: `tide`/`log`/`what is this?` and `résumé →` across the top,
// `auto:` and `sound:` across the bottom. Cards must never park on top of them.
const TOP_KEEPOUT = 56
const BOTTOM_KEEPOUT = 46
const CARD_GAP = 12
const COMPACT_H = 38 // a collapsed one-line card; see `.label.compact` in the CSS

const OBJECT_SCALE = TUNING.objects.scale
const WET_TONE = TUNING.objects.wetTone
const DRY_SECONDS = TUNING.objects.drySeconds

function wrackZ(i: number, n: number): number {
  return n > 1 ? Z_FIRST + ((Z_LAST - Z_FIRST) * i) / (n - 1) : Z_FIRST
}

// The emerge/submerge transition happens entirely while the object is inside
// the water region (shore between z+0.2 and z+2.0). Tide out: it surfaces
// through the foam edge just before the water lets go of it. Tide in: the
// water visibly takes it back — it never burrows into dry sand.
function exposure(z: number, shore: number): number {
  return Math.min(Math.max((z + 2.0 - shore) / 1.8, 0), 1)
}

// contact-shadow footprint per object (x radius, z radius, world units)
const FOOTPRINT: Record<string, [number, number]> = {
  driftwood: [1.5, 0.5],
  bottle: [1.1, 0.5],
  glassFloat: [0.68, 0.68],
  buoy: [1.0, 0.55],
  net: [1.1, 0.9],
  crate: [1.0, 0.75],
  shell: [0.85, 0.55],
  kelp: [1.2, 0.8],
  rope: [0.8, 0.7],
  canister: [0.95, 0.65],
}

function makeShadowTexture(): CanvasTexture {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const ctx = c.getContext('2d')!
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 64)
  grad.addColorStop(0, 'rgba(0,0,0,0.55)')
  grad.addColorStop(0.55, 'rgba(0,0,0,0.28)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 128)
  return new CanvasTexture(c)
}

type TonedMat = { mat: MeshLambertMaterial; base: Color }
type Placed = { left: number; top: number; right: number; bottom: number }

const proj = new Vector3()

function overlaps(a: Placed, b: Placed): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
}

export function Wrack() {
  const wrack = useSeed((s) => s.world.wrack)
  const waterHex = useSeed((s) => s.world.palette.water)
  const snowing = useSeed((s) => s.world.weather === 'snow')
  const snowHex = useSeed((s) => s.world.palette.foam)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)
  const groups = useRef<(Group | null)[]>([])
  const shadows = useRef<(MeshBasicMaterial | null)[]>([])
  const mats = useRef<TonedMat[][]>([])
  const settledAt = useRef<number[]>([])
  const shadowMap = useMemo(makeShadowTexture, [])
  const waterColor = useMemo(() => new Color(waterHex), [waterHex])
  const snowColor = useMemo(() => new Color(snowHex), [snowHex])

  // new tide: reset per-item animation state
  useEffect(() => {
    mats.current = []
    settledAt.current = []
  }, [wrack])

  useFrame((state) => {
    const shore = shoreZ()
    const now = state.clock.elapsedTime
    const { width, height } = size
    const n = wrack.length

    // pass 1: emergence + wetness + desired label rects
    const visible: {
      slot: NonNullable<ReturnType<typeof labelSlots.get>>
      rect: Placed
      sx: number
      sy: number
      e: number
      order: number
      open: boolean
      compact?: boolean
    }[] = []

    for (let i = 0; i < n; i++) {
      const g = groups.current[i]
      const item = wrack[i]
      if (!g || !item) continue
      const z = wrackZ(i, n)
      const t = exposure(z, shore)
      const e = t * t * (3 - 2 * t)
      const restY = -item.buriedDepth * BURY
      g.position.y = SUBMERGED_Y + (restY - SUBMERGED_Y) * e

      // contact shadow grounds the object; gone while the water holds it
      const sh = shadows.current[i]
      if (sh) sh.opacity = e * (0.34 - item.buriedDepth * 0.14)

      // wetness: just-exposed objects sit dark, dry out over a few seconds.
      // The static composition is a dry beach — no animation to carry the wet.
      if (t >= 1 && !(settledAt.current[i] >= 0)) settledAt.current[i] = now
      if (t < 1) settledAt.current[i] = -1
      const since = settledAt.current[i] >= 0 ? now - settledAt.current[i] : 0
      const tone = staticMode
        ? 1
        : t < 1
          ? WET_TONE
          : WET_TONE + (1 - WET_TONE) * Math.min(since / DRY_SECONDS, 1)
      let cache = mats.current[i]
      if (!cache) {
        cache = []
        g.traverse((o) => {
          const m = (o as Mesh).material as MeshLambertMaterial | undefined
          if (m && m.color) {
            // authored color lives on the material's userData — the cache can
            // be rebuilt mid-tint (StrictMode remount, tide change) and must
            // never capture an already-tinted color as "base"
            m.userData.baseColor ??= m.color.clone()
            cache.push({ mat: m, base: m.userData.baseColor as Color })
          }
        })
        mats.current[i] = cache
      }
      // while the water holds the object it reads through the water's color
      const submergeMix = (1 - e) * TUNING.objects.submergeTint
      // On a snow tide the beach goes white but the wrack used to stay bare.
      // Snow settles on whatever has been out of the water long enough to stop
      // melting it — the same clock the drying uses, run slower.
      const settling = snowing
        ? e * Math.min(since / TUNING.objects.snowSeconds, 1) * TUNING.objects.snowCover
        : 0
      for (const { mat, base } of cache) {
        mat.color.copy(base).multiplyScalar(tone)
        if (submergeMix > 0.01) mat.color.lerp(waterColor, submergeMix)
        if (settling > 0.01) mat.color.lerp(snowColor, settling)
      }

      // label anchor → screen
      const slot = labelSlots.get(item.specimen.id)
      if (!slot || !slot.card) continue
      if (e < 0.05) {
        slot.card.style.visibility = 'hidden'
        if (slot.line) slot.line.style.opacity = '0'
        if (slot.dot) slot.dot.style.opacity = '0'
        continue
      }
      proj
        .set(
          g.position.x,
          g.position.y + OBJECT_ANCHOR_Y[item.specimen.object] * OBJECT_SCALE,
          g.position.z,
        )
        .project(camera)
      const sx = (proj.x * 0.5 + 0.5) * width
      const sy = (0.5 - proj.y * 0.5) * height
      const w = slot.w || 300
      const h = slot.h || 96
      // card sits beside the object; flip side when it would leave the frame
      const left = sx + 26 + w < width - 12 ? sx + 26 : sx - 26 - w
      const rect: Placed = { left: 0, top: 0, right: 0, bottom: 0 }
      rect.left = Math.min(Math.max(left, 12), width - w - 12)
      rect.top = Math.min(
        Math.max(sy - 18, TOP_KEEPOUT),
        Math.max(height - BOTTOM_KEEPOUT - h, TOP_KEEPOUT),
      )
      rect.right = rect.left + w
      rect.bottom = rect.top + h
      visible.push({
        slot,
        rect,
        sx,
        sy,
        e,
        order: i,
        open: slot.card.classList.contains('open'),
      })
    }

    // A late tide uncovers every specimen at once, and the full cards then want
    // more vertical room than the viewport has. The resolver used to give up
    // and stack them on top of each other; instead, collapse the ones uncovered
    // longest ago to a single title line until the rest fit. The count comes
    // from the cards' full heights, never their collapsed ones, so it can't
    // flip back and forth between frames.
    const band = height - TOP_KEEPOUT - BOTTOM_KEEPOUT + CARD_GAP
    let stack = visible.reduce((sum, v) => sum + (v.slot.hFull || v.slot.h) + CARD_GAP, 0)
    // oldest first: wrack order runs high beach → water's edge
    const byAge = [...visible].sort((a, b) => a.order - b.order)
    for (const v of byAge) {
      if (stack <= band) break
      if (v.open) continue // never collapse the card being read
      stack -= (v.slot.hFull || v.slot.h) - COMPACT_H
      v.compact = true
    }

    for (const v of visible) {
      const card = v.slot.card
      if (!card) continue
      const was = card.classList.contains('compact')
      if (was !== !!v.compact) {
        card.classList.toggle('compact', !!v.compact)
        // the class changes the height this frame; don't lay out on a stale one
        v.slot.h = card.offsetHeight
        v.rect.bottom = v.rect.top + v.slot.h
      }
    }

    // pass 2: resolve card overlaps — push down first; if that runs off the
    // bottom of the viewport, place the card above the stack instead.
    // The open card is laid out first so it keeps the spot next to its own
    // object and the others move out of its way: it quadruples in height when
    // it opens, and going last meant it landed on top of a neighbour.
    visible.sort((a, b) => Number(b.open) - Number(a.open) || a.rect.top - b.rect.top)
    const placed: Placed[] = []
    for (const item of visible) {
      const r = item.rect
      const h = r.bottom - r.top
      let moved = true
      let guard = 0
      while (moved && guard++ < 24) {
        moved = false
        for (const p of placed) {
          if (overlaps(r, p)) {
            r.top = p.bottom + CARD_GAP
            r.bottom = r.top + h
            moved = true
          }
        }
      }
      if (r.bottom > height - BOTTOM_KEEPOUT) {
        // walk upward past everything it collides with
        r.top = Math.min(r.top, height - BOTTOM_KEEPOUT - h)
        r.bottom = r.top + h
        guard = 0
        while (guard++ < 24) {
          const hit = placed.find((p) => overlaps(r, p))
          if (!hit) break
          r.bottom = hit.top - CARD_GAP
          r.top = r.bottom - h
        }
        if (r.top < TOP_KEEPOUT) {
          r.top = TOP_KEEPOUT
          r.bottom = r.top + h
        }
      }
      placed.push(r)
    }

    // pass 3: write to the DOM
    for (const { slot, rect, sx, sy, e } of visible) {
      const card = slot.card
      if (!card) continue
      card.style.visibility = 'visible'
      card.style.opacity = String(e * e)
      card.style.pointerEvents = e > 0.85 ? 'auto' : 'none'
      card.style.transform = `translate3d(${rect.left.toFixed(1)}px, ${rect.top.toFixed(1)}px, 0)`
      if (slot.line && slot.dot) {
        const toRight = rect.left > sx
        const ex = toRight ? rect.left : rect.left + (rect.right - rect.left)
        const ey = Math.min(Math.max(sy, rect.top + 16), rect.bottom - 8)
        slot.line.setAttribute('x1', sx.toFixed(1))
        slot.line.setAttribute('y1', sy.toFixed(1))
        slot.line.setAttribute('x2', ex.toFixed(1))
        slot.line.setAttribute('y2', ey.toFixed(1))
        slot.dot.setAttribute('cx', sx.toFixed(1))
        slot.dot.setAttribute('cy', sy.toFixed(1))
        // A card shoved clear of the stack can end up a long way from its
        // object, and the hairline then cuts diagonally across everything else.
        // Fade the run with its length: the anchor dot keeps carrying the link.
        const run = Math.hypot(ex - sx, ey - sy)
        const near = Math.min(Math.max(1 - (run - 150) / 220, 0), 1)
        slot.line.style.opacity = String(e * (0.15 + 0.85 * near))
        slot.dot.style.opacity = String(e)
      }
    }

    // the one line of type fades as the tide starts to go out
    if (introEl.current && !staticMode) {
      introEl.current.style.opacity = String(Math.min(Math.max(1 - tide.progress * 7, 0), 1))
    }
    // the whole label layer yields to the résumé block at the deepest point
    if (layerEl.current) {
      const fade = Math.min(Math.max(1 - tide.overshootPx / (height * 0.5), 0), 1)
      layerEl.current.style.opacity = String(fade)
      layerEl.current.style.pointerEvents = fade < 0.4 ? 'none' : ''
    }
  })

  const builders = useMemo(
    () => wrack.map((item) => OBJECT_BUILDERS[item.specimen.object]()),
    [wrack],
  )

  // portrait reframe: the strandline compresses to what the viewport can see.
  // Desktop (≥ ~1170px) keeps the full ±20 spread unchanged.
  const xHalf = Math.min(20, size.width / (2 * 26) - 2.5)
  const worldX = wrack.map((item) => -xHalf + item.x * 2 * xHalf)

  return (
    <group>
      {wrack.map((item, i) => (
        <group
          key={item.specimen.id}
          ref={(g) => {
            groups.current[i] = g
          }}
          position={[worldX[i], SUBMERGED_Y, PLANE_Z + wrackZ(i, wrack.length)]}
          rotation-y={item.rotation}
          scale={OBJECT_SCALE}
        >
          {builders[i]}
        </group>
      ))}
      {wrack.map((item, i) => {
        const [rx, rz] = FOOTPRINT[item.specimen.object] ?? [0.9, 0.7]
        return (
          <group
            key={`sh-${item.specimen.id}`}
            position={[worldX[i], 0.015, PLANE_Z + wrackZ(i, wrack.length)]}
            rotation-y={item.rotation}
          >
            <mesh rotation-x={-Math.PI / 2} scale={[rx * OBJECT_SCALE, rz * OBJECT_SCALE, 1]}>
              <circleGeometry args={[1, 24]} />
              <meshBasicMaterial
                ref={(m) => {
                  shadows.current[i] = m
                }}
                map={shadowMap}
                transparent
                depthWrite={false}
                opacity={0}
              />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}
