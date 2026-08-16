# Tideline

James Yang's portfolio. Every visitor gets a different beach: one seed, drawn
at load, determines the time of day, weather, water, sand, ambient sound, and
which objects wash up on the strandline. The objects are the navigation — each
carries a field-log label with the actual résumé content. Scrolling is the
tide going out.

Seeds are ephemeral: the URL never carries one, and a reload draws fresh.
Sharing is explicit — clicking the seed tag (or `Keep this tide`) copies a
`?seed=xxxx-xxxx` link, which is honored once on load and then stripped.

**Chrome:** seed tag + `log` (kept tides) top-left, `résumé →` top-right,
`auto:` bottom-left, `sound:` bottom-right.

**`what is this?`** is not chrome — it sits in the middle of the frame directly
under the title (`ui/AboutTour.tsx`), because at scroll 0 it is the only thing
to do besides scroll. It fades and goes non-interactive with the intro line as
the tide starts out. It opens a walked tour (`ui/Tour.tsx`): nine steps that
ring each control in turn and advance on their own, pausing on hover or focus,
ending on *Start scrolling*. Three things to know if you touch it:

- It is **portalled to `<body>`**. `.intro` centres itself with a `transform`,
  and a transformed ancestor becomes the containing block for `position: fixed`
  descendants — rendered in place, the whole overlay was trapped inside the
  title's own box.
- The overlay is the **ring's own `box-shadow`** (`0 0 0 100vmax`), so the
  control being described is the one lit thing on screen. Steps with no target
  use a plain `.tour-scrim` instead.
- Steps whose control isn't on the page are dropped at mount — reduced motion
  has no `auto:`, so the tour is 8 steps there and 9 everywhere else.
Auto mode runs the tide out on its own at a constant pace and comes to rest on
the résumé; any wheel, touch, or key input hands control straight back and
switches it off — it is never a scroll-jack. Pace lives in `tuning.ts` →
`scroll.autoSeconds`.

**Hidden things.** Each tide independently rolls a set of easter eggs
(`lib/easters.ts`, rates in `tuning.ts` → `easters`), spanning a crab on about
a third of tides down to a rubber duck on roughly one in forty. Add a new one
by appending to the END of the draw list in `deriveEasters` — appending leaves
every existing tide's eggs untouched; inserting mid-list re-rolls them all.

## Commands

| command | what |
|---|---|
| `npm run dev` | dev server at `localhost:5173` |
| `npm run build` | typecheck + production build into `dist/` (static, deploys anywhere) |
| `npm run lint` | oxlint (includes the repo-wide `Math.random` ban) |
| `npm run shots -- <seed> [vh ...] [--mobile]` | screenshots into `shots/` (needs dev server) |
| `npm run probe [-- N]` | scan seeds → time/weather/amplitude, for curating notable tides |

`?debug` on any URL shows the full derived world for the current seed.

## Where things live

| file | owns |
|---|---|
| `src/content.ts` | **all résumé content** — the only file to touch for copy changes |
| `src/tuning.ts` | **every JS-side dial** — scales, counts, chances, audio levels, scroll pacing |
| `src/shaders/water.frag` / `.vert` | the water/sand/foam shader; GLSL dials listed in each TUNING header |
| `src/seed/deriveWorld.ts` | seed → world. **Guard the draw order** (see below) |
| `src/lib/palettes.ts` | the five hand-authored palettes + weather deltas |
| `src/scene/` | `Water` (shader host + fish schools + tide pools/rill/sun-lane uniforms), `Beach` (lights, debris, strand line, gulls), `Specimen` (objects, emergence, snow dusting, label projector), `Life` (sandpipers, sail, jumping fish, icebergs), `Easters` (the hidden things), `Precipitation` (clouds, rain, snow, shooting star, distant headland), `objects.tsx` (the 10 object builders) |
| `src/lib/easters.ts` | which hidden things a given tide carries |
| `src/lib/surf.ts` | live swash state, written by the water and read by the audio |
| `src/lib/lightRig.ts` | the per-time-of-day sun: lights *and* the water's reflected lane |
| `src/ui/` | labels, seed tag, kept tides, the tour, résumé block, end choice, audio toggle, auto mode |
| `src/audio/ambient.ts` | the sound (lazy-loaded on first unmute) |
| `src/ui/NotableTides.tsx` | the kept seed list. Add a seed and an optional human note; **what each tide *is* is derived from the seed**, never typed — hand-written names silently went stale when `snow` re-rolled every weather |

## Where the words live

Nothing user-visible is hard-coded in a component except the chrome's own
labels. If you are changing copy, it is one of these:

| text | file |
|---|---|
| **every specimen: title, year, one-line summary, full detail, links** | `src/content.ts` — this is the one that matters |
| the intro line over the water | `src/App.tsx` (`James Yang`) |
| the tour's nine steps | `src/ui/Tour.tsx` (`STEPS`) |
| the kept-tide list and its notes | `src/ui/NotableTides.tsx` (`NOTABLE`) |
| résumé heading, `N specimens catalogued`, the footnote | `src/ui/ResumeBlock.tsx` |
| `Keep this tide` / `Let it go` | `src/ui/EndChoice.tsx` |
| `résumé →`, `auto:`, `sound:`, `tide`, `log`, `what is this?` | `ResumeJump` / `AutoTide` / `AudioToggle` / `SeedTag` |

## Rules that keep it working

**Determinism.** One seed must always produce the same tide. `deriveWorld.ts`
draws every random value in a fixed order — never insert, remove, or reorder
draws there unless you accept re-rolling every existing tide (if you do,
update the note at the top and re-curate the notable list with `npm run probe`).
Two draws sat unused for a while and are now wired up: `sand.toneShift` into
`uSandColor` (`Water.tsx`) and `sand.wetLine` into `setTideRest` (`scroll.ts`),
which sets how far up the beach *this* tide rests. Changing what a draw *means*
is free; changing the number or order of draws is not.

**Draw-order changes so far**, both deliberate: adding `snow` to `WEATHERS`
(2026-08-14) re-rolled every tide's weather, and widening `wrackCount` to
`int(5, 8)` (2026-08-15) re-rolled which objects each tide carries. The second
one costs the same single draw, so nothing downstream shifted.

**Decorative streams.** Anything new that needs seeded randomness outside
`deriveWorld` uses its own instance: `mulberry32(hashSeed(seed) ^ 0xSOMETAG)`.
Existing tags: fish schools `0xf15f`, sandpipers `0x51de`, sail `0x5a1e`,
strands `0x57a4`, clouds `0xc10d`, gulls `0x9e3d`, audio events `0x5eabed`,
jumping fish `0x1a5b`, icebergs `0x1ce8`, easter-egg roll `0xea57`, crab
`0xc4ab`, footprints `0xf007`, whale `0x3ba1`, duck `0xd0c5`, tide pools + rill
`0xbeac`, headland `0x1a4d`. Pick a new tag, never reuse one.

**No `Math.random()`** anywhere, tooling included (lint enforces it in `src/`).

**The camera is orthographic, so nothing shrinks with distance on its own.**
Anything you place out at sea or up the beach has to fake it by hand or it
reads as a full-size object standing at the horizon. `lib/scroll.ts` has the
three helpers everything uses: `seawardZ(shore, depth, margin)` pins a thing
inside the water band (the plane's far edge at `WATER_FAR` *is* the horizon —
past it there is only sky, which is how whales and icebergs ended up flying),
`seaDistance(shore, z)` and `distanceOut(z)` give the 0→1 "how far out does
this read" that scale and haze key off. Haze toward the local sea colour, not
raw sky, and use `meshBasicMaterial` for anything meant to match the shader —
the light rig never touches shader output, so a lit mesh comes out warm
against cold water.

**Labels never stack.** The projector in `Specimen.tsx` collapses cards to a
single title line (`.label.compact`) when a tide has uncovered more specimens
than the viewport has room for, oldest-uncovered first, and the open card is
laid out before all the others so they move around it instead of over it.
`TOP_KEEPOUT`/`BOTTOM_KEEPOUT` reserve the chrome rows.

**Budgets.** 60fps desktop / 30fps mobile floor, initial JS under 400 kB
gzipped (currently ~325 kB; Tone.js is a lazy chunk that loads on unmute).
Check with `npm run build` and the fps readout in any screenshot session.

**Lenis owns the scroll.** It smooths wheel and touch but never sees the
keyboard, so `initTideScroll` handles scroll keys itself and drives
`lenis.scrollTo` — a native key scroll gets stomped on the next rAF. For the
same reason, a programmatic `window.scrollTo` (the screenshot script) has to be
set and then *confirmed*, not fired and trusted.

**Sound follows picture.** `Water.tsx` publishes the live swash run-up to
`lib/surf.ts` every frame and `audio/ambient.ts` fires a crash on the rising
edge, so each wave you watch break is the one you hear. Don't reintroduce a
private audio timer — `world.audio.swellPeriod` is a different draw from
`world.water.swash`, and running the sound off it desynchronised the two.

**Legibility.** The résumé is the point. Never obscure label or résumé text
with an effect; label paper/ink contrast is hand-authored per palette
(`paper` role in `palettes.ts`, keep ≥ 4.5:1 after perturbation).

## Common edits

- **Change résumé copy** → `content.ts` only. Labels, résumé block, and metadata all render from it.
- **Add a specimen** → new entry in `content.ts` with an `object` key from `ObjectKey`. If you add a new object *kind*: build it in `objects.tsx`, give it an `OBJECT_ANCHOR_Y`, and a `FOOTPRINT` in `Specimen.tsx`.
- **Tweak feel** (wave size, wet look, life density, audio level, scroll pacing) → `tuning.ts`, or the TUNING header lines in the shaders.
- **Add a weather** → extend `Weather` in `palettes.ts` + `applyWeather` delta + `WEATHERS` in `deriveWorld.ts` (this re-rolls weather on all tides — see determinism note), then handle it wherever `world.weather` is switched on (grep for `weather ===`).
- **Curate notable tides** → `npm run probe`, pick seeds, edit the list in `NotableTides.tsx`.
- **Palette work** → edit `palettes.ts`; check paper/ink contrast before shipping. The sun lane and the tide pools both read off `sky` vs `sand` luminance — if a new palette puts them close together, the pools wash out.
- **Beach features** (pool count, rill odds, headland odds) → the decorative `useMemo`s in `Water.tsx` and `Precipitation.tsx`.
