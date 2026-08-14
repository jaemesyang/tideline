// PLACEHOLDER CONTENT — every entry below is invented. Replace with real
// projects before launch. Written in the site's register so the voice is
// audible: plain, active, specific, no selling.

export type ObjectKey =
  | 'driftwood'
  | 'bottle'
  | 'glassFloat'
  | 'buoy'
  | 'net'
  | 'crate'
  | 'shell'
  | 'kelp'
  | 'rope'
  | 'canister'

export type Specimen = {
  id: string
  title: string
  kind: 'project' | 'writing' | 'about' | 'contact'
  object: ObjectKey
  year: string
  summary: string // one line, appears on the label
  detail: string // 2-4 sentences, expands on click
  links?: { label: string; url: string }[]
}

export const specimens: Specimen[] = [
  {
    id: 'saltmarsh',
    title: 'Saltmarsh',
    kind: 'project',
    object: 'driftwood',
    year: '2024',
    summary: 'Live hydrology map for a county flood office.',
    detail:
      'Sensor data lands, gets cleaned, and renders in under a second. Built the ingest pipeline and the map client. Ran unattended for two years; the office noticed it twice, both times because a river actually flooded.',
    links: [{ label: 'case study', url: 'https://example.com/saltmarsh' }],
  },
  {
    id: 'ledger',
    title: 'Ledger',
    kind: 'project',
    object: 'crate',
    year: '2023',
    summary: 'Double-entry bookkeeping engine for a payments startup.',
    detail:
      'Every cent traceable to a transaction pair. Wrote the core, the migration off the old system, and the reconciliation reports. Zero balance drift since cutover.',
    links: [{ label: 'writeup', url: 'https://example.com/ledger' }],
  },
  {
    id: 'gullwing',
    title: 'Gullwing',
    kind: 'project',
    object: 'buoy',
    year: '2023',
    summary: 'Flight-search interface that answers in one screen.',
    detail:
      'No pagination, no spinner theater. Results stream in ranked and settle in place. Prototype convinced the client to rebuild their search stack around it.',
  },
  {
    id: 'drift',
    title: 'Drift',
    kind: 'project',
    object: 'glassFloat',
    year: '2022',
    summary: 'Ocean-current visualization from public NOAA data.',
    detail:
      'A year of surface currents, one canvas, sixty frames a second. Personal project that got picked up by two oceanography courses as teaching material.',
    links: [{ label: 'live', url: 'https://example.com/drift' }],
  },
  {
    id: 'quayside',
    title: 'Quayside',
    kind: 'project',
    object: 'rope',
    year: '2022',
    summary: 'Design system for a port logistics company.',
    detail:
      'Forty screens of legacy software brought under one component library. Shipped with usage docs the internal team still maintains without me. That was the goal.',
  },
  {
    id: 'foghorn',
    title: 'Foghorn',
    kind: 'project',
    object: 'canister',
    year: '2021',
    summary: 'Alerting service that pages people less.',
    detail:
      'Deduplicates, groups, and holds non-urgent alerts until morning. On-call pages dropped by two thirds in the first month. The pager going quiet is the whole feature.',
  },
  {
    id: 'wrack-notes',
    title: 'Field notes on generative color',
    kind: 'writing',
    object: 'bottle',
    year: '2024',
    summary: 'Why seeded palettes beat random ones.',
    detail:
      'Wide-open random color is what makes generative work look cheap. The essay walks through constraint systems that keep variation alive without losing authorship.',
    links: [{ label: 'read', url: 'https://example.com/color' }],
  },
  {
    id: 'slack-tide',
    title: 'Slack tide',
    kind: 'writing',
    object: 'kelp',
    year: '2023',
    summary: 'On tools that work best when idle.',
    detail:
      'Most software is judged while being used. Some of the best software is judged by how little it needs to be. Short essay on designing for absence.',
  },
  {
    id: 'about',
    title: 'Observer',
    kind: 'about',
    object: 'shell',
    year: '—',
    summary: 'Design engineer. Interfaces, data, the seam between.',
    detail:
      'Ten years building interfaces that carry real data. Comfortable from shader to schema. Works alone or embedded in a team; ships either way.',
  },
  {
    id: 'contact',
    title: 'Contact',
    kind: 'contact',
    object: 'net',
    year: '—',
    summary: 'Reachable. Replies within a day.',
    detail: 'Email is fastest. Open to staff engineering and design engineering roles, contract or full time.',
    links: [
      { label: 'email', url: 'mailto:placeholder@example.com' },
      { label: 'github', url: 'https://github.com/placeholder' },
    ],
  },
]
