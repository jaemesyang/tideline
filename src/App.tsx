import { useSeed } from './seed/useSeed'
import { SeedDebug } from './seed/SeedDebug'

// Phase 1: determinism core only. Scene, labels, and real UI arrive in later phases.
function App() {
  const seed = useSeed((s) => s.seed)

  if (new URLSearchParams(window.location.search).has('debug')) {
    return <SeedDebug />
  }

  return (
    <main style={{ minHeight: '100vh', padding: 24 }}>
      <span
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 13,
        }}
      >
        tide {seed}
      </span>
      <p style={{ marginTop: 80 }}>Phase 1 — determinism core. Add ?debug to the URL for the full dump.</p>
    </main>
  )
}

export default App
