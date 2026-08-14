// One seed → one mulberry32 instance → every random draw in the app,
// in the fixed order defined by deriveWorld. Math.random() is banned repo-wide.

export function mulberry32(a: number): () => number {
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const SEED_BODY = /^[0-9a-z]{8}$/

/** Accepts "7f2a-3391", "7F2A3391", etc. Returns canonical "xxxx-xxxx" or null. */
export function normalizeSeed(raw: string): string | null {
  const s = raw.trim().toLowerCase().replace(/-/g, '')
  return SEED_BODY.test(s) ? `${s.slice(0, 4)}-${s.slice(4)}` : null
}

/** FNV-1a over the 8 seed chars. Pure integer math — identical in every JS engine. */
export function hashSeed(seed: string): number {
  const s = seed.replace('-', '')
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

/** Fresh seed from CSPRNG. Only place randomness enters from outside the seed. */
export function generateSeed(): string {
  const buf = new Uint32Array(2)
  crypto.getRandomValues(buf)
  // 36^4 = 1679616 possible values per half
  const part = (n: number) => (n % 1679616).toString(36).padStart(4, '0')
  return `${part(buf[0])}-${part(buf[1])}`
}
