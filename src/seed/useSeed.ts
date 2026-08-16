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

// The URL never carries the current seed: a reload draws a fresh tide.
// Sharing is explicit — shareUrl() builds a ?seed= link, and an incoming
// ?seed= is honored once, then stripped, so the shared tide is itself
// ephemeral after it's seen.

function consumeSeedFromUrl(): string | null {
  const url = new URL(window.location.href)
  const raw = url.searchParams.get('seed')
  if (raw === null) return null
  url.searchParams.delete('seed')
  history.replaceState(null, '', url)
  return normalizeSeed(raw)
}

/** The shareable link for a tide — the only place a seed enters a URL. */
export function shareUrl(seed: string): string {
  return `${window.location.origin}${window.location.pathname}?seed=${seed}`
}

const initialSeed = consumeSeedFromUrl() ?? generateSeed()

export const useSeed = create<SeedStore>((set) => ({
  seed: initialSeed,
  world: deriveWorld(initialSeed),
  setSeed: (raw) => {
    const seed = normalizeSeed(raw)
    if (!seed) return false
    set({ seed, world: deriveWorld(seed) })
    return true
  },
  newTide: () => {
    const seed = generateSeed()
    set({ seed, world: deriveWorld(seed) })
  },
}))
