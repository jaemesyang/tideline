import { useSeed } from '../seed/useSeed'

export function SkipLink() {
  const ink = useSeed((s) => s.world.palette.ink)

  return (
    <a
      href="/plain.html"
      style={{
        position: 'fixed',
        top: 16,
        right: 16,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 13,
        color: ink,
        textDecoration: 'none',
        zIndex: 10,
      }}
    >
      Skip →
    </a>
  )
}
