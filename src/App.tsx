import { useEffect } from 'react'
import { useSeed } from './seed/useSeed'
import { SeedDebug } from './seed/SeedDebug'
import { Scene } from './scene/Scene'
import { SkipLink } from './ui/SkipLink'
import { initTideScroll } from './lib/scroll'

function App() {
  const seed = useSeed((s) => s.seed)
  const ink = useSeed((s) => s.world.palette.ink)
  const debug = new URLSearchParams(window.location.search).has('debug')

  useEffect(() => {
    if (debug) return
    return initTideScroll()
  }, [debug])

  if (debug) {
    return <SeedDebug />
  }

  return (
    <>
      <Scene />
      {/* scroll runway: the whole page is this tall; scrolling it is the tide going out */}
      <div style={{ height: '500vh' }} aria-hidden />
      <SkipLink />
      <span
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
          color: ink,
        }}
      >
        tide {seed}
      </span>
    </>
  )
}

export default App
