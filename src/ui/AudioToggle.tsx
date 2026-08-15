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

  const play = async () => {
    mod.current ??= await import('../audio/ambient')
    const world = useSeed.getState().world
    playingSeed.current = world.seed
    await mod.current.start(world)
  }

  const toggle = () => {
    if (!on) {
      setOn(true)
      void play()
    } else {
      setOn(false)
      playingSeed.current = null
      mod.current?.stop()
    }
  }

  // a new tide is a different sea — retune if sound is on
  useEffect(() => {
    if (on && playingSeed.current && playingSeed.current !== seed) void play()
  }, [seed, on])

  useEffect(() => () => mod.current?.stop(), [])

  return (
    <button type="button" className="audio-toggle" aria-pressed={on} onClick={toggle}>
      sound: {on ? 'on' : 'off'}
    </button>
  )
}
