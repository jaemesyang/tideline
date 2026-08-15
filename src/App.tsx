import { useEffect } from 'react'
import { useSeed } from './seed/useSeed'
import { SeedDebug } from './seed/SeedDebug'
import { Scene } from './scene/Scene'
import { SkipLink } from './ui/SkipLink'
import { SeedTag } from './ui/SeedTag'
import { AudioToggle } from './ui/AudioToggle'
import { LabelLayer } from './ui/Label'
import { ResumeBlock } from './ui/ResumeBlock'
import { EndChoice } from './ui/EndChoice'
import { introEl } from './ui/labelBridge'
import { initTideScroll, nudgeTide, RUNWAY_VH } from './lib/scroll'
import { staticMode } from './lib/motion'

function App() {
  const palette = useSeed((s) => s.world.palette)
  const debug = new URLSearchParams(window.location.search).has('debug')

  useEffect(() => {
    if (debug || staticMode) return
    return initTideScroll()
  }, [debug])

  // load sequence (§6): if the visitor only watches, the tide begins to go
  // out on its own after a beat. One gentle nudge, never repeated, and only
  // if they haven't already scrolled.
  useEffect(() => {
    if (debug || staticMode) return
    const t = window.setTimeout(() => {
      if (window.scrollY < 8) nudgeTide()
    }, 4500)
    return () => window.clearTimeout(t)
  }, [debug])

  // the palette lives on :root — everything DOM-side styles itself from it
  useEffect(() => {
    const root = document.documentElement.style
    for (const [role, hex] of Object.entries(palette)) {
      root.setProperty(`--${role}`, hex)
    }
  }, [palette])

  if (debug) {
    return <SeedDebug />
  }

  const intro = (
    <p
      className={staticMode ? 'intro-line intro-static' : 'intro-line'}
      ref={(el) => {
        introEl.current = el
      }}
    >
      This tide has never come in before and won&rsquo;t again.
    </p>
  )

  return (
    <>
      <Scene />
      {staticMode ? (
        // static composition: one still frame of the beach, then the résumé
        <div style={{ height: '100svh', position: 'relative' }}>{intro}</div>
      ) : (
        <>
          {/* scroll runway: the whole page is this tall; scrolling it is the tide going out */}
          <div style={{ height: `${RUNWAY_VH}vh` }} aria-hidden />
          <LabelLayer />
          {intro}
        </>
      )}
      <ResumeBlock />
      <EndChoice />
      <SkipLink />
      <SeedTag />
      <AudioToggle />
    </>
  )
}

export default App
