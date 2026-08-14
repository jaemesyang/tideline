import { create } from 'zustand'
import { generateSeed, normalizeSeed } from './mulberry32'
import { deriveWorld, type World } from './deriveWorld'

type SeedStore = {
  seed: string
  world: World
  /** Set a specific tide (paste box, notable tides). Returns false on invalid input. */
  setSeed: (raw: string) => boolean
  /** "Let it go": clear the current seed, draw a fresh one. */
  newTide: () => void
}

function readSeedFromUrl(): string | null {
  const raw = new URLSearchParams(window.location.search).get('seed')
  return raw ? normalizeSeed(raw) : null
}

// replaceState, not pushState: a refresh must not silently change the tide,
// and back-button must not walk through discarded seeds.
function writeSeedToUrl(seed: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('seed', seed)
  history.replaceState(null, '', url)
}

const initialSeed = readSeedFromUrl() ?? generateSeed()
writeSeedToUrl(initialSeed)

export const useSeed = create<SeedStore>((set) => ({
  seed: initialSeed,
  world: deriveWorld(initialSeed),
  setSeed: (raw) => {
    const seed = normalizeSeed(raw)
    if (!seed) return false
    writeSeedToUrl(seed)
    set({ seed, world: deriveWorld(seed) })
    return true
  },
  newTide: () => {
    const seed = generateSeed()
    writeSeedToUrl(seed)
    set({ seed, world: deriveWorld(seed) })
  },
}))
