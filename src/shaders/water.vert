// Open-water displacement: 2 Gerstner-style octaves, seeded.
// Waves attenuate to zero approaching the shoreline; the swash zone is
// handled entirely in the fragment shader (1D fronts, cheap).
//
// Plane is rotated -90° about X, so: local +y == world -z, local +z == world +y.

uniform float uTime;
uniform vec4 uOctave1; // amplitude, wavelength, direction(rad), phase
uniform vec4 uOctave2;
uniform vec2 uOmega; // angular speed per octave
uniform float uShoreZ;

varying vec2 vXZ;
varying float vCrest;

vec3 gerstner(vec2 xz, vec4 o, float omega, out float crest) {
  vec2 dir = vec2(cos(o.z), sin(o.z));
  float k = 6.28318 / o.y;
  float f = k * dot(dir, xz) - omega * uTime + o.w;
  crest = sin(f) * 0.5 + 0.5;
  float q = 0.55; // crest sharpening
  return vec3(-dir.x * o.x * q * cos(f), sin(f) * o.x, -dir.y * o.x * q * cos(f));
}

void main() {
  vec3 p = position;
  vec2 xz = vec2(p.x, -p.y);
  float depth = uShoreZ - xz.y; // > 0 in open water
  float att = smoothstep(0.4, 5.0, depth);

  float c1;
  float c2;
  vec3 d1 = gerstner(xz, uOctave1, uOmega.x, c1);
  vec3 d2 = gerstner(xz, uOctave2, uOmega.y, c2);
  vec3 disp = (d1 + d2) * att;

  p.x += disp.x;
  p.y -= disp.z; // world z shift → local -y
  p.z += disp.y; // world y (up) → local +z

  vXZ = xz;
  float ampSum = max(uOctave1.x + uOctave2.x, 1e-4);
  vCrest = att * (c1 * uOctave1.x + c2 * uOctave2.x) / ampSum;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
