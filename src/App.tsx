import { useSeed } from './seed/useSeed'
import { SeedDebug } from './seed/SeedDebug'
import { Scene } from './scene/Scene'
import { SkipLink } from './ui/SkipLink'

function App() {
  const seed = useSeed((s) => s.seed)
  const ink = useSeed((s) => s.world.palette.ink)

  if (new URLSearchParams(window.location.search).has('debug')) {
    return <SeedDebug />
  }

  return (
    <>
      <Scene />
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
