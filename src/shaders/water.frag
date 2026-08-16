// Shoreline fragment: swash fronts, foam, wet sand, grain.
// All noise is ALU hash-based — zero texture fetches (mobile budget).
//
// TUNING (JS-side dials live in src/tuning.ts; these are the GLSL ones):
//   crest lighting        → `0.78 + 0.38 * vCrest` in the water section
//   rolling band strength → the `roll` line (0.055 factor)
//   breaker whiteness     → `smoothstep(0.42, 0.72, churn)`
//   swash lace patchiness → `smoothstep(0.28, 0.58, ...)` on edgeFoam
//   wet-sand darkness     → `mix(1.0, 0.62, wetness)` in the sand section
//   wet-band width        → `smoothstep(0.0, 5.5, z - uShoreZ)` (dryT)
//   sand grain strength   → the g / g2 multiplier line
//   fish shadow darkness  → `* 0.24 * shoalMask`
//   sun lane width/reach  → `laneW` and its two smoothsteps (strength is
//                           JS-side: Water.tsx → LANE)
//   pool colour           → `poolCol` mix toward uSkyColor
//   snow depth on sand    → `lying * 0.85` and the smoothstep(1.0, 11.0, above)

uniform float uTime;
uniform vec3 uWaterColor;
uniform vec3 uSkyColor;
uniform vec3 uSandColor;
uniform vec3 uFoamColor;
uniform float uFoamDensity;
uniform float uShoreZ;
uniform float uHorizonBleed; // 0.45 clear → 0.85 haze
uniform float uRain; // 0 or 1
uniform float uGrainScale;
// runup, omega, phase, noiseOffset. Always 3; unused fronts have runup=0.
// (Kept as three scalars-of-vec4, no array/loop: dynamic loops over uniform
// arrays trigger a pathological ~45s ANGLE→Metal shader compile on macOS.)
uniform vec4 uSwashA;
uniform vec4 uSwashB;
uniform vec4 uSwashC;
// fish-shadow schools: x, depth-below-waterline, headingX, headingY
uniform vec4 uSchoolA;
uniform vec4 uSchoolB;
uniform vec2 uSchoolOn;
uniform float uGlow; // bioluminescence (rare easter egg): 0 or 1
// sun/moon lane on the water: x = world x of the column, y = strength (0 = off)
uniform vec2 uLane;
// tide pools left on the drying beach. x, z, radius, z-aspect. radius 0 = none.
// (Three scalars, not an array — same ANGLE compile trap as the swash fronts.)
uniform vec4 uPoolA;
uniform vec4 uPoolB;
uniform vec4 uPoolC;
// the rill draining the beach: x, meander phase, strength (0 = none)
uniform vec3 uRill;
uniform float uSnow; // snow lying on the dry beach: 0 or 1

varying vec2 vXZ;
varying float vCrest;

float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise1(float x) {
  float i = floor(x);
  float f = fract(x);
  float u = f * f * (3.0 - 2.0 * f);
  return mix(hash11(i), hash11(i + 1.0), u);
}

// one fish: an elongated soft dark mark in the school's heading frame
float fishMark(vec2 d, vec2 h, float t, float j) {
  vec2 r = vec2(d.x * h.x + d.y * h.y, -d.x * h.y + d.y * h.x);
  r.y += sin(t * 5.0 + j * 2.4 + r.x * 2.0) * 0.05; // swim wiggle
  return exp(-(r.x * r.x / 0.10 + r.y * r.y / 0.013));
}

float school(vec2 p, vec4 s, float shoreZ, float t) {
  vec2 h = s.zw;
  vec2 c = vec2(s.x, shoreZ - s.y);
  // trailing school formation, offsets in the heading frame
  float m = fishMark(p - c, h, t, 0.0);
  m += fishMark(p - c + vec2(0.55 * h.x - 0.28 * h.y, 0.55 * h.y + 0.28 * h.x), h, t, 1.0);
  m += fishMark(p - c + vec2(0.6 * h.x + 0.3 * h.y, 0.6 * h.y - 0.3 * h.x), h, t, 2.0);
  m += fishMark(p - c + vec2(1.15 * h.x - 0.05 * h.y, 1.15 * h.y + 0.05 * h.x), h, t, 3.0);
  m += fishMark(p - c + vec2(1.05 * h.x + 0.5 * h.y, 1.05 * h.y - 0.5 * h.x), h, t, 4.0);
  return m;
}

// A dished basin. Returns 1 in the middle of the pool, 0 past the rim; the
// second value is the damp margin the water leaves around it.
vec2 poolAt(vec2 p, vec4 c) {
  if (c.z < 0.01) return vec2(0.0);
  vec2 d = (p - c.xy) / vec2(c.z, c.z * c.w);
  // Irregular outline. A clean ellipse read as a decal painted on the sand;
  // two low harmonics keyed off the centre give each pool its own shoreline.
  float a = atan(d.y, d.x);
  float wob = 1.0 + 0.17 * sin(a * 3.0 + c.x) + 0.11 * sin(a * 5.0 - c.y * 0.7);
  float r = length(d) / wob;
  return vec2(1.0 - smoothstep(0.55, 1.0, r), 1.0 - smoothstep(0.92, 1.45, r));
}

float noise2(vec2 x) {
  vec2 i = floor(x);
  vec2 f = fract(x);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash21(i), hash21(i + vec2(1.0, 0.0)), u.x),
    mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  float x = vXZ.x;
  float z = vXZ.y;
  float t = uTime;

  // --- swash: overlapping 1D fronts with a laced edge, each fed by a wave
  // that visibly rolls in through the surf zone, breaks, and becomes the
  // run-up. `breaker` carries the traveling white water. ---
  float front = uShoreZ;
  float wet = 0.0;
  float breaker = 0.0;
  {
    vec4 s = uSwashA;
    float on = step(0.01, s.x);
    float e = sin(s.y * t + s.z);
    float r = pow(max(e, 0.0), 0.7); // fast run-up, slow retreat
    float lace = (noise1(x * 0.35 + s.w) - 0.5) * (0.5 + 1.2 * r) * on;
    front = max(front, uShoreZ + s.x * r + lace);
    float since = mod(s.y * t + s.z - 1.5708, 6.28318) / s.y;
    float reach = uShoreZ + s.x + lace;
    wet = max(wet, on * exp(-since / 4.0) * (1.0 - smoothstep(reach - 0.15, reach + 0.05, z)));
    // incoming breaker: rides shoreward during the half-period before run-up
    float ang = mod(s.y * t + s.z + 3.14159, 6.28318) - 3.14159;
    float prog = clamp((ang + 3.14159) / 3.14159, 0.0, 1.0);
    float bz = uShoreZ - mix(12.0, 0.5, pow(prog, 0.85));
    float bl = (noise1(x * 0.45 + s.w * 1.7) - 0.5) * 1.6;
    float band = exp(-pow((z - bz + bl) / (0.8 + 1.3 * (1.0 - prog)), 2.0));
    float sect = 0.3 + 0.7 * noise1(x * 0.15 + s.w * 3.1 + prog * 0.6);
    float amp = smoothstep(0.12, 0.7, prog) * (1.0 - smoothstep(0.0, 1.1, ang)) * sect;
    breaker = max(breaker, on * band * amp);
  }
  {
    vec4 s = uSwashB;
    float on = step(0.01, s.x);
    float e = sin(s.y * t + s.z);
    float r = pow(max(e, 0.0), 0.7);
    float lace = (noise1(x * 0.35 + s.w) - 0.5) * (0.5 + 1.2 * r) * on;
    front = max(front, uShoreZ + s.x * r + lace);
    float since = mod(s.y * t + s.z - 1.5708, 6.28318) / s.y;
    float reach = uShoreZ + s.x + lace;
    wet = max(wet, on * exp(-since / 4.0) * (1.0 - smoothstep(reach - 0.15, reach + 0.05, z)));
    float ang = mod(s.y * t + s.z + 3.14159, 6.28318) - 3.14159;
    float prog = clamp((ang + 3.14159) / 3.14159, 0.0, 1.0);
    float bz = uShoreZ - mix(12.0, 0.5, pow(prog, 0.85));
    float bl = (noise1(x * 0.45 + s.w * 1.7) - 0.5) * 1.6;
    float band = exp(-pow((z - bz + bl) / (0.8 + 1.3 * (1.0 - prog)), 2.0));
    float sect = 0.3 + 0.7 * noise1(x * 0.15 + s.w * 3.1 + prog * 0.6);
    float amp = smoothstep(0.12, 0.7, prog) * (1.0 - smoothstep(0.0, 1.1, ang)) * sect;
    breaker = max(breaker, on * band * amp);
  }
  {
    vec4 s = uSwashC;
    float on = step(0.01, s.x);
    float e = sin(s.y * t + s.z);
    float r = pow(max(e, 0.0), 0.7);
    float lace = (noise1(x * 0.35 + s.w) - 0.5) * (0.5 + 1.2 * r) * on;
    front = max(front, uShoreZ + s.x * r + lace);
    float since = mod(s.y * t + s.z - 1.5708, 6.28318) / s.y;
    float reach = uShoreZ + s.x + lace;
    wet = max(wet, on * exp(-since / 4.0) * (1.0 - smoothstep(reach - 0.15, reach + 0.05, z)));
    float ang = mod(s.y * t + s.z + 3.14159, 6.28318) - 3.14159;
    float prog = clamp((ang + 3.14159) / 3.14159, 0.0, 1.0);
    float bz = uShoreZ - mix(12.0, 0.5, pow(prog, 0.85));
    float bl = (noise1(x * 0.45 + s.w * 1.7) - 0.5) * 1.6;
    float band = exp(-pow((z - bz + bl) / (0.8 + 1.3 * (1.0 - prog)), 2.0));
    float sect = 0.3 + 0.7 * noise1(x * 0.15 + s.w * 3.1 + prog * 0.6);
    float amp = smoothstep(0.12, 0.7, prog) * (1.0 - smoothstep(0.0, 1.1, ang)) * sect;
    breaker = max(breaker, on * band * amp);
  }

  float inWater = 1.0 - smoothstep(front - 0.02, front + 0.02, z);
  float depth = uShoreZ - z;

  // perspective-warped z for water patterning — matches the vertex warp so
  // texture bands compress toward the horizon with the waves
  float away = clamp(20.0 - z, 0.0, 60.0);
  float zw = z - 0.010 * away * away;

  // --- water ---
  float breakup = noise2(vec2(x * 2.2, zw * 2.6) + t * 0.25);
  float fine = noise2(vec2(x * 5.0, zw * 5.0) - t * 0.18);

  // depth-layered color: sandy shallows → true water → deep band → sky at the
  // horizon. This banding is what makes it read as a sea, not a gradient.
  vec3 shallowCol = mix(uWaterColor, uSandColor, 0.45);
  vec3 deepCol = uWaterColor * 0.68;
  vec3 water = mix(shallowCol, uWaterColor, smoothstep(0.3, 3.5, depth));
  water = mix(water, deepCol, smoothstep(5.0, 16.0, depth));
  water = mix(water, uSkyColor, smoothstep(9.0, 26.0, depth) * uHorizonBleed);
  water *= 0.78 + 0.38 * vCrest; // crests catch light, troughs sit dark
  water *= 0.95 + 0.10 * noise2(vec2(x * 0.22, zw * 1.1) + t * 0.05); // current lanes
  water *= 0.962 + 0.076 * fine; // small-scale surface shimmer
  // rolling swell bands: coherent light stripes travelling shoreward, so the
  // waves stay legible even where displacement foreshortens away
  float roll = sin(zw * 0.85 - t * 1.15 + noise1(x * 0.14) * 2.2);
  water *= 1.0 + 0.055 * roll * smoothstep(1.5, 7.0, depth) * (1.0 - smoothstep(18.0, 30.0, depth));

  // Sun (or moon) lane: a broad column of reflected light running down the
  // swell toward the shore, so the far water is a surface catching light and
  // not a flat gradient. Smooth by construction — every term is a sine or a
  // smoothstep, never a per-frame hash, which is what made the old sparkle
  // glint strobe and read as lag.
  if (uLane.y > 0.001) {
    float laneW = 2.4 + 0.22 * depth;
    float lane = exp(-pow((x - uLane.x) / laneW, 2.0));
    lane *= smoothstep(0.5, 5.0, depth) * (1.0 - smoothstep(19.0, 33.0, depth));
    lane *= 0.30 + 0.70 * smoothstep(0.10, 0.85, vCrest); // rides the crests
    lane *= 0.80 + 0.20 * roll;
    water += uFoamColor * lane * uLane.y;
  }

  // fish shadows sliding through the shallows
  float shoalMask = smoothstep(1.2, 3.0, depth) * (1.0 - smoothstep(9.0, 13.0, depth));
  float fish = uSchoolOn.x * school(vec2(x, z), uSchoolA, uShoreZ, t) +
    uSchoolOn.y * school(vec2(x, z), uSchoolB, uShoreZ, t);
  water *= 1.0 - clamp(fish, 0.0, 1.0) * 0.24 * shoalMask;

  // whitecaps: clumped, not misted — hard threshold against drifting noise
  float crestFoam = smoothstep(0.78, 0.95, vCrest * (0.55 + 0.5 * breakup)) *
    smoothstep(0.35, 0.75, fine) * uFoamDensity;
  // the traveling breaker: crisp white churn, no half-mixed murk
  float churn = 0.62 * noise2(vec2(x * 2.8, z * 3.4) - vec2(t * 0.15, t * 0.55)) +
    0.38 * noise2(vec2(x * 6.5, z * 7.5) - vec2(-t * 0.1, t * 0.4));
  float breakerFoam = breaker * smoothstep(0.42, 0.72, churn) * (0.85 + 0.5 * uFoamDensity);
  // swash edge: patchy lace with holes, plus a crisp bright rim at the line
  float edgeFoam = smoothstep(1.1, 0.05, front - z) * inWater;
  float lacePat = noise2(vec2(x * 3.2, z * 4.2) - vec2(t * 0.35, t * 0.1));
  float holes = noise2(vec2(x * 7.5, z * 8.5) + t * 0.22);
  edgeFoam *= smoothstep(0.28, 0.58, lacePat * 0.62 + holes * 0.38);
  float rim = smoothstep(0.16, 0.0, front - z) * inWater;
  float foam = clamp(crestFoam + breakerFoam + edgeFoam * 1.1 + rim * 0.9, 0.0, 1.0);
  water = mix(water, uFoamColor, foam);
  // bioluminescence: the disturbed water carries the light, so it rides the
  // breaking foam and the swash edge rather than the open surface
  water += vec3(0.05, 0.62, 0.55) * uGlow * foam * (0.35 + 0.45 * breakerFoam);

  // --- sand ---
  // Standing water the ebb leaves behind: pools in the low spots and the rill
  // draining between them. Both need `above` — how long ago the tide passed —
  // so they fill in as the water retreats instead of appearing under it.
  float above = z - uShoreZ;
  vec2 pA = poolAt(vec2(x, z), uPoolA);
  vec2 pB = poolAt(vec2(x, z), uPoolB);
  vec2 pC = poolAt(vec2(x, z), uPoolC);
  float settle = smoothstep(0.2, 3.2, above);
  float pool = max(max(pA.x, pB.x), pC.x) * settle;
  float poolEdge = max(max(pA.y, pB.y), pC.y) * settle;

  // The rill: a narrow channel of running water, not a wide smudge. A Gaussian
  // 0.62 wide read as a dark tentacle laid over the beach — it wants a thin
  // wet core with a hairline of damp sand either side, nothing more.
  float rillX = uRill.x + sin(z * 0.14 + uRill.y) * 2.4 + sin(z * 0.37 + uRill.y * 2.0) * 0.8;
  float rillD = abs(x - rillX);
  float rillWindow = uRill.z * smoothstep(0.4, 4.0, above) * (1.0 - smoothstep(15.0, 26.0, above));
  float rill = (1.0 - smoothstep(0.09, 0.30, rillD)) * rillWindow;
  float rillDamp = (1.0 - smoothstep(0.26, 0.85, rillD)) * rillWindow;

  // wet-to-dry: a saturated dark line at the water's edge decaying over a
  // wide band up the beach, with the live swash wet laid on top
  float dryT = smoothstep(0.0, 5.5, z - uShoreZ);
  float wetness = clamp(
    max(max(wet, pow(1.0 - dryT, 1.6)), max(poolEdge * 0.7, rillDamp * 0.6)), 0.0, 1.0);
  vec3 sand = uSandColor * mix(1.0, 0.62, wetness);
  // wet sand mirrors the sky — the sheen that sells the waterline
  sand = mix(sand, uSkyColor, wetness * wetness * 0.22);
  // elevation gradient: high beach reads lighter and warmer than the flats
  sand *= 0.90 + 0.16 * smoothstep(-6.0, 26.0, z);
  sand *= 0.96 + 0.08 * noise2(vec2(x * 0.12, z * 0.12)); // large-scale mottling
  // ripple shading: soft low-frequency undulations along the beach slope
  sand *= 0.965 + 0.07 * noise2(vec2(x * 0.55, z * 0.9));
  // two grain octaves — the tooth
  float g = hash21(floor(vec2(x, z) * (14.0 * uGrainScale)));
  float g2 = hash21(floor(vec2(x, z) * (34.0 * uGrainScale)) + 7.0);
  sand *= 0.955 + g * 0.055 + g2 * 0.035;
  // shell flecks on dry sand. Thresholding a per-cell hash lit whole cells and
  // read as hard axis-aligned squares; shape each one inside its cell instead.
  vec2 fc = vec2(x, z) * 6.0;
  vec2 fid = floor(fc);
  float fh = hash21(fid + 3.0);
  vec2 fp = fract(fc) - vec2(fract(fh * 17.3), fract(fh * 41.1));
  float fleck = step(0.985, fh) * smoothstep(0.16, 0.03, length(fp)) * (1.0 - wetness);
  sand = mix(sand, uFoamColor, fleck * 0.5);
  // foam residue: bubble patches the retreating swash leaves behind, popping
  // away as the sand drains (threshold climbs as `wet` decays)
  float bub = noise2(vec2(x * 4.6, z * 6.5));
  float residue = smoothstep(1.0 - wet * 0.42, 1.04 - wet * 0.42, bub) * wet;
  sand = mix(sand, uFoamColor, residue * 0.65);
  sand += vec3(0.05, 0.62, 0.55) * uGlow * residue * 0.5; // glow left on the sand

  // Tide pools: still water holding the sky. The one thing on the whole beach
  // that reflects, so the deep-tide half of the frame has something in it.
  // Weighted well toward the sky — a straight water mix came out a saturated
  // teal lozenge that read as a sticker rather than as standing water.
  // Wet sand under glass, not a coloured patch: a dark saturated bed with the
  // sky laid over it, and a sheen where the surface catches the light. Mixing
  // straight toward the water colour just made a flat sage lozenge.
  // The bed has to be both darker AND cooler than dry sand or the pool washes
  // out entirely on the warm palettes, where sky and sand sit at nearly the
  // same luminance and a plain sky mix reads as a patch of moss.
  vec3 poolBed = mix(uSandColor * 0.40, uWaterColor, 0.45);
  vec3 poolCol = mix(poolBed, uSkyColor, 0.42);
  float sheen = pool * smoothstep(0.3, 0.95, 0.5 + 0.5 * sin(z * 1.6 + x * 0.45 + t * 0.05));
  poolCol = mix(poolCol, uFoamColor, sheen * 0.34);
  poolCol *= 0.975 + 0.05 * noise2(vec2(x * 2.6, z * 3.4) + t * 0.07); // a breath of ripple
  // replace the sand almost entirely — grain showing through read as damp, not wet
  sand = mix(sand, poolCol, pool * 0.94);
  sand += vec3(0.05, 0.62, 0.55) * uGlow * pool * 0.35; // the glow strands in them
  // a bright rim where the water meets the sand
  sand = mix(sand, uFoamColor, clamp(poolEdge - pool, 0.0, 1.0) * (1.0 - dryT * 0.4) * 0.4);

  // the rill runs shallow water over the sand it just cut
  sand = mix(sand, mix(mix(uWaterColor, uSkyColor, 0.6), uSandColor, 0.3), rill * 0.75);

  // Snow lying on the beach: it survives on dry sand well above the water and
  // drifts patchily. No snow in the pools or the rill — it lands and melts.
  if (uSnow > 0.5) {
    float lying = smoothstep(1.0, 11.0, above) * (1.0 - wetness);
    lying *= smoothstep(0.30, 0.78, 0.42 + 0.58 * noise2(vec2(x * 0.20, z * 0.20)));
    lying *= 0.75 + 0.25 * noise2(vec2(x * 1.6, z * 1.6)); // crust texture
    lying *= 1.0 - clamp(pool + rillDamp, 0.0, 1.0);
    sand = mix(sand, mix(uFoamColor, uSkyColor, 0.14), lying * 0.85);
  }

  vec3 col = mix(sand, water, inWater);

  // rain: sparse drops flash where they hit, fading into the distance. Same
  // shaping as the shell flecks — a bare cell threshold drew square pixels.
  vec2 rc = vec2(x, z) * 4.0;
  vec2 rid = floor(rc);
  float rh = hash21(rid + floor(t * 6.0));
  vec2 rp = fract(rc) - vec2(fract(rh * 21.7), fract(rh * 53.3));
  float pit = uRain * inWater * step(0.9965, rh) * smoothstep(0.3, 0.06, length(rp)) *
    smoothstep(32.0, 8.0, depth);
  col = mix(col, mix(col, uFoamColor, 0.5), pit);

  // fine grain everywhere — survey-notebook tooth, not gloss
  col += (hash21(gl_FragCoord.xy) - 0.5) * 0.02;

  gl_FragColor = vec4(col, 1.0);
}
