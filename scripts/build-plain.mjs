// Generates /plain.html from src/content.ts. Run as part of `npm run build`.
// One source of truth: this file must never hand-author résumé copy.
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { specimens } from '../src/content.ts'
import { PALETTES } from '../src/lib/palettes.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outPath = resolve(__dirname, '../plain.html')

const { water, sand, foam, ink } = PALETTES.afternoon

const KIND_LABEL = {
  about: 'About',
  project: 'Projects',
  writing: 'Writing',
  contact: 'Contact',
}

function escape(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Group by kind, preserving first-occurrence order — the array order in
// content.ts (about pinned first, contact pinned last) drives section order.
const kindOrder = []
const groups = new Map()
for (const s of specimens) {
  if (!groups.has(s.kind)) {
    groups.set(s.kind, [])
    kindOrder.push(s.kind)
  }
  groups.get(s.kind).push(s)
}

function renderLinks(links) {
  if (!links || links.length === 0) return ''
  const items = links.map((l) => `<li><a href="${escape(l.url)}">${escape(l.label)}</a></li>`).join('')
  return `\n            <ul class="links">${items}</ul>`
}

function renderArticle(s) {
  const yearSpan = s.year !== '—' ? ` <span class="year">${escape(s.year)}</span>` : ''
  return `        <article>
          <h3>${escape(s.title)}${yearSpan}</h3>
          <p class="summary">${escape(s.summary)}</p>
          <p class="detail">${escape(s.detail)}</p>${renderLinks(s.links)}
        </article>`
}

function renderSection(kind) {
  const id = `${kind}-h`
  const articles = groups.get(kind).map(renderArticle).join('\n\n')
  return `      <section aria-labelledby="${id}">
        <h2 id="${id}">${KIND_LABEL[kind] ?? kind}</h2>

${articles}
      </section>`
}

const sections = kindOrder.map(renderSection).join('\n\n')

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tideline — résumé</title>
    <meta name="description" content="Full résumé: projects, writing, and contact." />
    <style>
      :root {
        --ink: ${ink};
        --sand: ${sand};
        --foam: ${foam};
        --water: ${water};
      }
      * {
        box-sizing: border-box;
      }
      html {
        background: var(--sand);
      }
      body {
        margin: 0 auto;
        padding: 48px 24px 96px;
        max-width: 640px;
        background: var(--sand);
        color: var(--ink);
        font: 16px/1.55 -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      }
      a {
        color: var(--water);
      }
      a:visited {
        color: var(--water);
      }
      header {
        margin-bottom: 40px;
      }
      .top {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        gap: 16px;
        margin-bottom: 32px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px;
      }
      h1 {
        font-size: 28px;
        margin: 0;
        letter-spacing: -0.01em;
      }
      h2 {
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        margin: 40px 0 16px;
        padding-bottom: 6px;
        border-bottom: 1px solid var(--ink);
        opacity: 0.8;
      }
      article {
        margin-bottom: 24px;
        padding: 14px 16px;
        background: var(--foam);
        border: 1px solid var(--ink);
        border-radius: 2px;
      }
      article h3 {
        margin: 0 0 4px;
        font-size: 17px;
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .year {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px;
        font-weight: 400;
        opacity: 0.7;
        white-space: nowrap;
      }
      .summary {
        margin: 0 0 8px;
        font-weight: 600;
      }
      .detail {
        margin: 0;
      }
      .links {
        margin: 10px 0 0;
        padding: 0;
        list-style: none;
        display: flex;
        gap: 14px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px;
      }
      footer {
        margin-top: 56px;
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 13px;
      }
    </style>
  </head>
  <body>
    <div class="top">
      <span>plain</span>
      <a href="/">View the tide</a>
    </div>

    <header>
      <h1>Tideline</h1>
    </header>

    <main>
${sections}
    </main>

    <footer>
      <a href="/">View the tide</a>
    </footer>
  </body>
</html>
`

writeFileSync(outPath, html)
console.log(`wrote ${outPath} (${specimens.length} specimens)`)
