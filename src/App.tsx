import { useEffect } from 'react'
import { useSeed } from './seed/useSeed'
import { SeedDebug } from './seed/SeedDebug'
import { Scene } from './scene/Scene'
import { ResumeJump } from './ui/ResumeJump'
import { SeedTag } from './ui/SeedTag'
import { AudioToggle } from './ui/AudioToggle'
import { AutoTide } from './ui/AutoTide'
import { LabelLayer } from './ui/Label'
import { ResumeBlock } from './ui/ResumeBlock'
import { EndChoice } from './ui/EndChoice'
import { introEl } from './ui/labelBridge'
import { initTideScroll, nudgeTide, setTideRest, RUNWAY_VH } from './lib/scroll'
import { TUNING } from './tuning'
import { staticMode } from './lib/motion'

function App() {
  const palette = useSeed((s) => s.world.palette)
  const wetLine = useSeed((s) => s.world.sand.wetLine)
  const debug = new URLSearchParams(window.location.search).has('debug')

  useEffect(() => {
    if (debug || staticMode) return
    return initTideScroll()
  }, [debug])

  // each tide comes in to its own mark (deriveWorld's sand.wetLine)
  useEffect(() => {
    setTideRest(wetLine)
  }, [wetLine])

  // load sequence (§6): if the visitor only watches, the tide begins to go
  // out on its own after a beat. One gentle nudge, never repeated, and only
  // if they haven't already scrolled.
  useEffect(() => {
    if (debug || staticMode || TUNING.scroll.nudgeAfterSeconds <= 0) return
    const t = window.setTimeout(() => {
      if (window.scrollY < 8) nudgeTide()
    }, TUNING.scroll.nudgeAfterSeconds * 1000)
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
      James Yang
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
      <ResumeJump />
      <SeedTag />
      <AudioToggle />
      <AutoTide />
    </>
  )
}

export default App
