# Tideline — approved design plan (post-critique)

## Palettes — each owns a temperature

| time | name | sky | water | sand | foam | ink |
|---|---|---|---|---|---|---|
| dawn | rose | `#d9c2bc` | `#6e8291` | `#a8988a` | `#eadfd6` | `#33383e` |
| overcast | pewter | `#b4bbbc` | `#46595f` | `#97907f` | `#dcdad2` | `#272c2e` |
| afternoon | amber | `#e3c892` | `#2e5e66` | `#cdaf7e` | `#efe3c8` | `#3b3222` |
| dusk | plum | `#5c4a5a` | `#2e3a50` | `#6e6058` | `#c9b8b0` | `#dcd5cd` |
| night | moon | `#141b24` | `#1e2b36` | `#3e3f3a` | `#8e9ba1` | `#c7ccce` |

Seed perturbs hue ±6°, lightness ±4%. Weather is a co-equal axis with fixed
color deltas (haze: black-point lift + contrast drop; rain: desaturate sand,
darken water; wind: motion/foam only). Ink never touched by weather.
Forbidden: cream near #F4F1EA, terracotta near #D97757, near-black + acid green.

## Type

- Display: **Marcellus** — inscriptional, chart-lettering register. ~4 uses total.
- Body: **Alegreya Sans** — humanist sans, real texture at 16–18px.
- Utility/mono: **Fragment Mono** — instrument output; seed, catalogue numbers, metadata.

## Water

Two zones, one shader. Open water: 2 Gerstner octaves (background texture).
Shoreline: explicit swash model — 2–3 overlapping 1D fronts, seeded period /
run-up / phase, noise-laced edge, wet-sand decay ~4s. Tide position = single
uniform driven by Lenis scroll.

Mobile budget (enforced from Phase 2): 0.75 DPR cap, 2 octaves, 1 noise fetch,
≤8ms GPU on mid phone. Cut order if over: chop octave → grain → never the swash.

## Résumé block (deepest point)

Same ruled system as the floating labels, denser: mono catalogue no. + year per
row, body-face summary/detail at 68ch, links in mono. Order = tide's catalogue
order. Reads as a complete résumé with no interaction.

## Deferred by design

- `/plain` (Phase 5): semantic HTML, zero scene JS, <10kb.
- Mobile (Phase 5): same scene, portrait reframe, full-width labels.
- Notable tides (Phase 6): popover from seed tag; curated list + paste-a-seed input.
