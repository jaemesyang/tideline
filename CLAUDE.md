# Tideline

James Yang's portfolio: a seeded beach where the scroll is the tide going out
and the objects on the strandline are the résumé. **Read README.md first** —
it has the file map, the commands, and the common-edit recipes.

Phases 1–6 of `tideline-build-prompt.md` are complete. That prompt is now
history, not a plan: where it and the shipped site disagree, the site wins
(see "Deliberate spec departures" below). No more checkpoint gating — make
changes directly, verify, and report.

## Hard rules

- Never call `Math.random()`. Seeded randomness only — `deriveWorld`'s single
  mulberry32 instance, or a tagged decorative stream
  (`mulberry32(hashSeed(seed) ^ 0xTAG)`, tags listed in README).
- Never reorder, insert, or remove draws in `deriveWorld.ts` without saying so
  — it silently re-rolls every existing tide, including the notable list.
- Never scroll-jack or disable native scrolling.
- Never obscure résumé or label text with an effect. Legibility beats mood.
- 60fps desktop / 30fps mobile floor; initial JS under 400 kB gzipped. Cut
  features, not the budget.

## Deliberate spec departures

- **No `/plain` page.** Removed at James's request; the `résumé →` button
  scrolls to the deepest-point résumé block instead. Don't reintroduce it.
- **Seeds are not in the URL.** A reload draws a fresh tide; sharing is
  explicit via the copy action (`shareUrl()` in `useSeed.ts`).
- **The one allowed line** is now "James Yang", not the tide sentence.
- **`snow`** exists as a fifth weather beyond the spec's four.
- **Auto mode** (`auto:` bottom-left) runs the tide out hands-free to the
  résumé. Opt-in and interruptible by any scroll input, so it does not
  violate the no-scroll-jacking rule — keep it that way.
- **A `what is this?` tour explains the concept.** The spec forbade this;
  James asked for it. The button sits in the middle of the frame under the
  title, and the tour walks the controls one ring at a time (`ui/Tour.tsx`).
  One step now says that some tides carry things most don't — James asked for
  the eggs to be *mentioned*. Mentioning is the whole licence: never name one,
  never list them, never say how rare.

## Working here

Tuning is centralized: `src/tuning.ts` for JS dials, TUNING headers atop the
shaders for GLSL ones. Prefer changing a dial over adding a new constant.

Three traps that have each cost a round of rework — the README explains all
three: the camera is orthographic (nothing shrinks or hazes with distance
unless you do it by hand, and the water plane's far edge *is* the horizon);
Lenis owns the scroll (native `scrollTo` and key scrolling both get stomped);
and the light rig never touches shader output (a lit mesh next to the water
comes out warm against cold).

Verify visually — this is a visual project and typechecking proves nothing
about how it looks. `npm run dev`, then `npm run shots -- <seed> <vh...>` and
actually look at the images. Good seeds to spot-check across palettes:
`0005-qxkg` (afternoon clear), `0009-fjyl` (dawn), `0000-cdv1` (dusk),
`0001-l70c` (overcast), `0002-u05m` (night surf), `0002-9yqg` (night rain),
`0009-08uc` (snow).

James cares about: the water looking genuinely good, real detail over flat
surfaces, and the site feeling alive. He'll say when something reads as
"laggy" or "lacking flavor" — that's a cue to look at motion quality and
scene richness, not to add more UI.
