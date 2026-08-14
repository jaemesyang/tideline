# TIDELINE — build prompt

Paste this into Claude Code. Build it in the phases given, in order, and stop at each checkpoint.

---

## 1. What you are building

A personal portfolio site called **Tideline**.

The core idea: **every visitor sees a different version of the site, and the site tells them so.**

A single random seed is drawn the moment the page loads. That seed determines the time of day, the weather, the color of the water, the way the waves move, the ambient sound, and — most importantly — **what has washed up on the beach.** The debris on the strandline is the navigation. Each object is a project or a section of the résumé.

Two people who visit will not see the same beach. Refresh and the tide you had is gone. There is no back button to it.

The seed is displayed at all times in the corner, in mono, like a tide-log entry: `tide 7f2a-3391`. Clicking it copies a shareable URL. Loading `?seed=7f2a-3391` restores that exact tide, byte for byte. This is the mechanism that makes the whole thing land: someone shows a friend, the friend sees something different, and the first question out of their mouth is "how does this work."

**The idea underneath it, which the site never states out loud:** nobody chooses what the tide brings in. The site is a working argument about contingency, made entirely through behavior rather than confession. Do not write essays about this anywhere in the UI. One line of copy, early, is the entire allowance:

> *This tide has never come in before and won't again.*

That is the only philosophical statement on the site. Everything else is dry, warm, and factual.

---

## 2. Non-negotiable constraints

- **The résumé must be genuinely readable.** This is a portfolio first and an experience second. Every project's real detail is present, legible, and never obscured by an effect.
- **A skip link, always visible, top right: `Skip →`.** It goes to `/plain`, a static, unstyled-adjacent, sub-300ms text page with the full résumé. Recruiters take that exit. Do not make it feel like a punishment.
- **Content is constant; the world is variable.** The seed changes atmosphere, palette, arrangement, motion, and audio. The seed never changes what a project *says*.
- **The visitor mostly watches.** One real choice only, at the end (see §6).
- **Nothing personal or confessional.** No autobiography, no life story, no "my journey." Field-log register throughout.
- **Audio is muted by default**, with a small speaker toggle. Never autoplay sound.
- **`prefers-reduced-motion` gets a static composition** — one beautiful still frame of that seed's beach, all content laid out normally. Not a degraded version. A different, quieter, equally finished one.

---

## 3. Stack

Do not deviate without asking.

- **Vite + React + TypeScript**
- **React Three Fiber + drei** for the scene. Orthographic camera, roughly side-on / three-quarter view of a shoreline.
- **Custom GLSL** for the water surface and foam. Do not use a prebuilt ocean library; the water is the thing people will look at, and it needs to be yours.
- **Lenis** for smooth scroll. No scroll-jacking, no hijacked wheel events, no forced snap points.
- **Tone.js** for the generated ambient audio.
- **zustand** for seed and global state. Nothing heavier.
- **No seeded-RNG dependency.** Implement `mulberry32` inline (about 8 lines) and derive every random value from it so the seed is fully deterministic.
- Deploy target: Vercel. Static build, no server.

**Performance budget, enforced:** 60fps on desktop, 30fps floor on a mid-range phone, first paint under 1.5s, total JS under 400kb gzipped. If a feature can't fit the budget, cut the feature, not the budget.

---

## 4. Determinism rules

This is the part that breaks if done carelessly. Get it right first, before anything looks good.

- One seed → one `mulberry32` instance → every random draw in the app, in a fixed order.
- Seeds are 8 characters, base36, formatted `xxxx-xxxx`.
- On load: read `?seed=` from the URL. If absent, generate one from `crypto.getRandomValues` and **push it into the URL with `replaceState`** so a refresh doesn't silently change it mid-session.
- Same seed must produce a pixel-identical scene on any device and any browser. Test this explicitly: open the same seed in two browsers and diff screenshots.
- Never draw from `Math.random()` anywhere in the codebase. Add an ESLint rule banning it.

---

## 5. What the seed controls

| Axis | Range |
|---|---|
| Time of day | dawn, overcast morning, low afternoon sun, dusk, night |
| Weather | clear, haze, light rain, wind |
| Water | color, wave amplitude, period, foam density, direction |
| Sand | tone, wetness line, texture grain, scattered small debris |
| Wrack line | which 6–9 objects appear, their spacing, rotation, half-buried depth |
| Order | which project the visitor encounters first |
| Ambient audio | wave period, filter character, occasional gull or buoy tone |
| Palette | derived from time of day + weather, never freely random |

**Palette must never be arbitrary.** Build five hand-authored palettes, one per time of day, each 5 named hex values. The seed picks a palette and then perturbs hue by at most ±6° and lightness by at most ±4%. Wide-open random color is what makes generative work look cheap.

Explicitly forbidden palettes: warm cream backgrounds near `#F4F1EA`, terracotta accents near `#D97757`, and near-black with a single acid-green accent. Those are the current AI-design defaults and they will read as a tell.

---

## 6. Structure and flow

**Load (0–1.2s).** Empty water, no UI. Tide is in — the beach is submerged. The seed appears in the corner. One line of type. Then the tide begins to go out.

**Scroll = the tide receding.** As the visitor scrolls, the waterline retreats down the screen and progressively exposes the strandline. Objects emerge wet and half-buried, in the arrangement the seed chose. This is the only navigation metaphor; use it consistently and don't add a second one.

**Objects = content.** Each washed-up object, when it clears the waterline, gets a **field-log label** anchored to it: a small card in mono, ruled, with a catalogue number, a date, and the actual project write-up. The label is where the résumé lives, and it is plain, dense, and readable. The object is the hook; the label is the substance.

**Deepest point.** The tide is fully out. Everything is exposed. Full résumé block, contact, links.

**The one choice.** At the very bottom, two options, no explanation beyond the labels:

- `Keep this tide` → copies the seeded URL, confirms with a small `Saved.`
- `Let it go` → the tide comes back in, the beach submerges, the seed clears, a new one is drawn.

Do not editorialize either button. The choice speaks for itself or it doesn't.

---

## 6b. Notable tides

A short curated list — six or seven seeds I've found and kept, each with a one-word name and nothing else. `night, heavy surf` / `low sun, quiet`. Clicking one loads that tide.

Reachable from the seed display in the corner, not from the main flow. It should feel like a list someone keeps, not a feature. Paired with it: a small input to paste a seed directly.

This exists because seed-trading is already a behavior people have. Lean on it, don't explain it.

---

## 7. Visual direction

**Register:** field survey. Clean, precise, technical, laid over something with tooth and warmth. Think a coastal survey notebook — ruled labels, catalogue numbers, careful hand-drawn linework — not a beach vacation.

**Type — three roles, pick deliberately and do not use the same face twice:**
- *Display*: something with real character, used sparingly. Sizes large, tracking tight.
- *Body*: a workhorse with a good reading texture at 16–18px.
- *Utility/mono*: the seed, catalogue numbers, coordinates, all label metadata. This face does a lot of the work and should feel like instrument output.

**Structure encodes truth.** Catalogue numbers on the labels are legitimate — they're a real sequence, assigned by the tide. Do not add decorative `01 / 02 / 03` markers anywhere else.

**Spend the boldness in one place: the water.** The shader is the signature element. Everything around it — type, labels, layout — stays quiet, tight, and disciplined. If a decoration doesn't serve the shoreline or the label system, cut it.

---

## 8. Content

I do not have the real content yet. Build against a single `src/content.ts` exporting a typed array, with clearly-marked placeholders I fill in later. Shape:

```ts
type Specimen = {
  id: string;
  title: string;
  kind: 'project' | 'writing' | 'about' | 'contact';
  object: ObjectKey;      // which 3D object represents it
  year: string;
  summary: string;        // one line, appears on the label
  detail: string;         // 2-4 sentences, expands on click
  links?: { label: string; url: string }[];
};
```

Eight to twelve entries. Placeholder copy should be written in the site's actual voice so I can hear the register — plain, active, specific, no filler, no selling. Not "Lorem ipsum," and not marketing language either.

---

## 9. Build phases — stop at each checkpoint

1. **Determinism core.** Seed generation, URL sync, `mulberry32`, a debug page that dumps every seeded value. *Checkpoint: same seed, two browsers, identical dump.*
2. **Water.** The GLSL surface and foam alone, full screen, seeded parameters, no content. *Checkpoint: it looks good enough to stare at and holds 60fps.*
3. **Tide mechanic.** Lenis scroll drives the waterline. Placeholder boxes emerge. *Checkpoint: the motion feels right before anything is pretty.*
4. **Objects and labels.** Real 3D objects, the label system, typography, palettes. *Checkpoint: readable, and the résumé actually reads well.*
5. **`/plain`, reduced-motion, mobile.** All three fallbacks, finished, not degraded. *Checkpoint: skip link works and the plain page is fast.*
6. **Audio, the ending choice, polish.** *Checkpoint: full pass on a real phone.*

---

## 10. Do not

- Do not build a loading screen longer than one second.
- Do not scroll-jack, snap-scroll, or disable native scrolling.
- Do not hide the résumé behind interaction. It is the point.
- Do not add a second navigation metaphor. The tide is the only one.
- Do not use the phrase "welcome to my portfolio," or any variant.
- Do not explain the concept in UI copy beyond the single allowed line.
- Do not make it look like a video game. No voxels, no blocky terrain, no game HUD, no pixel fonts. The seed mechanic borrows a structural idea from games; the visual language must not borrow anything at all.
- Do not add features I didn't ask for. If you think of one, propose it at a checkpoint instead of building it.

---

## 11. Before you write code

Produce a short design plan first: five named palettes with hex values, the three chosen typefaces with a rationale for each, an ASCII wireframe of the shoreline composition at three scroll positions, and one paragraph on the water shader approach. Then critique that plan against §7 — if any part of it is what you'd produce for a generic portfolio brief rather than for this one specifically, revise it and say what you changed.

Show me the plan. Wait for my go before starting Phase 1.
