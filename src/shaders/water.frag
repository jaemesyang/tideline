// Shoreline fragment: swash fronts, foam, wet sand, grain.
// All noise is ALU hash-based — zero texture fetches (mobile budget).

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

  // --- swash: overlapping 1D fronts with a laced edge ---
  float front = uShoreZ;
  float wet = 0.0;
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
  }

  float inWater = 1.0 - smoothstep(front - 0.02, front + 0.02, z);
  float depth = uShoreZ - z;

  // --- water ---
  vec3 water = mix(uWaterColor, uSkyColor, smoothstep(9.0, 26.0, depth) * uHorizonBleed);
  water *= 0.88 + 0.24 * vCrest; // crests catch light
  water *= 0.95 + 0.10 * noise2(vec2(x * 0.22, z * 1.1) + t * 0.05); // current lanes
  float shallow = (1.0 - smoothstep(0.0, 2.5, front - z)) * 0.3;
  water = mix(water, uSandColor * 0.85, clamp(shallow, 0.0, 1.0));

  float breakup = noise2(vec2(x * 2.2, z * 2.6) + t * 0.25);
  float fine = noise2(vec2(x * 5.0, z * 5.0) - t * 0.18);
  float crestFoam =
    smoothstep(0.80, 0.97, vCrest * (0.55 + 0.5 * breakup)) * (0.4 + 0.6 * fine) * uFoamDensity;
  float edgeFoam = smoothstep(0.55, 0.05, front - z) * inWater;
  edgeFoam *= 0.35 + 0.65 * noise2(vec2(x * 2.6, z * 3.2) - t * 0.3);
  float foam = clamp(crestFoam + edgeFoam * 1.2, 0.0, 1.0);
  water = mix(water, uFoamColor, foam);

  // --- sand ---
  float dryT = smoothstep(0.0, 1.8, z - uShoreZ); // permanent wet band at rest line
  float wetness = clamp(max(wet, 1.0 - dryT), 0.0, 1.0);
  vec3 sand = uSandColor * mix(1.0, 0.74, wetness);
  sand *= 0.97 + 0.06 * noise2(vec2(x * 0.12, z * 0.12)); // large-scale mottling
  float g = hash21(floor(vec2(x, z) * (14.0 * uGrainScale)));
  sand *= 0.985 + g * 0.03;
  float speckle = step(0.86, noise2(vec2(x * 3.0, z * 3.0))) * wet * 0.5;
  sand = mix(sand, uFoamColor, speckle);

  vec3 col = mix(sand, water, inWater);

  // rain pits the surface
  float pit = uRain * inWater * step(0.995, hash21(floor(vec2(x, z) * 9.0) + floor(t * 7.0)));
  col *= 1.0 - pit * 0.15;

  // fine grain everywhere — survey-notebook tooth, not gloss
  col += (hash21(gl_FragCoord.xy) - 0.5) * 0.02;

  gl_FragColor = vec4(col, 1.0);
}
