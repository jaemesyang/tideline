import { useSeed } from '../seed/useSeed'
import { specimens } from '../content'
import { SpecimenLinks } from './SpecimenLinks'

// The deepest point (§6): tide fully out, everything exposed. The complete
// résumé in the tide's catalogue order, no interaction needed to read any of
// it. Specimens the tide didn't carry in still appear — content is constant —
// they just carry no catalogue number, because the numbers belong to the tide.

export function ResumeBlock() {
  const seed = useSeed((s) => s.seed)
  const wrack = useSeed((s) => s.world.wrack)
  const ashore = specimens.filter((s) => !wrack.some((w) => w.specimen.id === s.id))

  const rows = [
    ...wrack.map((w) => ({ specimen: w.specimen, cat: w.catalogueNo })),
    ...ashore.map((s) => ({ specimen: s, cat: '—' })),
  ]

  return (
    <main className="resume-block">
      <h1>Tideline</h1>
      <div className="resume-head-meta">
        <span>tide {seed}</span>
        <span>{wrack.length} specimens catalogued</span>
      </div>
      {rows.map(({ specimen, cat }) => (
        <article key={specimen.id}>
          <div className="resume-cat">
            {cat}
            {'\n'}
            {specimen.year}
          </div>
          <div>
            <h2>{specimen.title}</h2>
            <p className="resume-summary">{specimen.summary}</p>
            <p className="resume-detail">{specimen.detail}</p>
            <SpecimenLinks links={specimen.links} className="resume-links" />
          </div>
        </article>
      ))}
      {ashore.length > 0 && (
        <p className="resume-ashore">— entries without a number were not carried in on this tide.</p>
      )}
    </main>
  )
}
