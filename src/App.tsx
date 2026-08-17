import { useEffect } from 'react'
import { useSeed } from './seed/useSeed'
import { SeedDebug } from './seed/SeedDebug'
import { Scene } from './scene/Scene'
import { ResumeJump } from './ui/ResumeJump'
import { SeedTag } from './ui/SeedTag'
import { AboutTour } from './ui/AboutTour'
import { AudioToggle } from './ui/AudioToggle'
import { AutoTide } from './ui/AutoTide'
import { LabelLayer } from './ui/Label'
import { ResumeBlock } from './ui/ResumeBlock'
import { EndChoice } from './ui/EndChoice'
import { introEl } from './ui/labelBridge'
import { initTideScroll, nudgeTide, setTideRest, RUNWAY_VH } from './lib/scroll'
import { TUNING } from './tuning'
import { staticMode } from './lib/motion'
import { mixHex, readableOn } from './lib/palettes'

function App() {
  const palette = useSeed((s) => s.world.palette)
  const wetLine = useSeed((s) => s.world.sand.wetLine)
  const weather = useSeed((s) => s.world.weather)
  const carnival = useSeed((s) => s.world.carnival)
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
    // The title is the one piece of type with nothing behind it but the sea,
    // and on a few tides (afternoon/rain worst, 2.2:1) plain --ink all but
    // disappeared into it. Approximate what water.frag actually paints under
    // the title — deep water bled toward the sky by uHorizonBleed at that
    // depth — and lift the ink off it only when it needs it.
    const under = mixHex(mixHex(palette.water, '#000000', 0.32), palette.sky, weather === 'haze' ? 0.67 : 0.41)
    root.setProperty('--intro-ink', readableOn(palette.ink, under, 3.4))
    // One tide paints the water every hue at once, so no single ink can be
    // guaranteed against it — that one gets the title on paper instead.
    document.documentElement.toggleAttribute('data-carnival', carnival)
  }, [palette, weather, carnival])

  if (debug) {
    return <SeedDebug />
  }

  const intro = (
    <div
      className={staticMode ? 'intro intro-static' : 'intro'}
      ref={(el) => {
        introEl.current = el
      }}
    >
      <p className="intro-line">James Yang</p>
      <AboutTour />
    </div>
  )

  return (
    <>
      <Scene />
      {staticMode ? (
        // Static composition: one still frame of the beach, then the résumé.
        // The labels belong here too — without them the objects are unnamed
        // and the reduced-motion visitor loses the navigation entirely.
        <div style={{ height: '100svh', position: 'relative' }}>
          <LabelLayer />
          {intro}
        </div>
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
