import { useEffect, useRef, useState } from 'react'
import { useSeed } from '../seed/useSeed'

// Muted by default, never autoplays (§2). Tone.js loads on the first click.
// State flips immediately — audio catches up when the context resumes.

type AmbientModule = typeof import('../audio/ambient')

export function AudioToggle() {
  const seed = useSeed((s) => s.seed)
  const [on, setOn] = useState(false)
  const mod = useRef<AmbientModule | null>(null)
  const playingSeed = useRef<string | null>(null)
  // Tone.js is lazy-loaded and start() is async, so "on" can be cancelled while
  // it is still in flight. Without this the stop() found no module to stop, the
  // import landed a moment later, and the sea played on with the toggle reading
  // off. Every start carries a ticket; a stale one throws its work away.
  const gen = useRef(0)

  const play = async () => {
    const mine = ++gen.current
    mod.current ??= await import('../audio/ambient')
    if (mine !== gen.current) return
    const world = useSeed.getState().world
    playingSeed.current = world.seed
    await mod.current.start(world, () => mine !== gen.current)
    if (mine !== gen.current) mod.current.stop()
  }

  const silence = () => {
    gen.current++
    playingSeed.current = null
    mod.current?.stop()
  }

  const toggle = () => {
    if (!on) {
      setOn(true)
      void play()
    } else {
      setOn(false)
      silence()
    }
  }

  // a new tide is a different sea — retune if sound is on
  useEffect(() => {
    if (on && playingSeed.current && playingSeed.current !== seed) void play()
  }, [seed, on])

  useEffect(() => () => silence(), [])

  return (
    <button type="button" className="audio-toggle" aria-pressed={on} onClick={toggle}>
      sound: {on ? 'on' : 'off'}
    </button>
  )
}
