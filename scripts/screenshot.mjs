// Screenshot a tide at one or more scroll positions (in vh of scroll).
// Requires the dev server: `npm run dev` in another terminal.
//
//   npm run shots -- <seed> [vh ...]        e.g.  npm run shots -- 0005-qxkg 0 200 430
//   npm run shots -- <seed> --mobile        390×844 viewport
//
// Output lands in shots/. Set CHROME to your Chrome binary if not on macOS.
import puppeteer from 'puppeteer-core'
import { mkdirSync } from 'node:fs'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const args = process.argv.slice(2).filter((a) => a !== '--mobile')
const mobile = process.argv.includes('--mobile')
const seed = args[0]
if (!seed) {
  console.error('usage: npm run shots -- <seed> [vh ...] [--mobile]')
  process.exit(1)
}
const stops = args.slice(1).map(Number)
const positions = stops.length ? stops : [0, 120, 240, 360, 430]

mkdirSync('shots', { recursive: true })
const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'shell',
  args: ['--hide-scrollbars', '--force-device-scale-factor=1'],
})
const page = await browser.newPage()
await page.setViewport(
  mobile ? { width: 390, height: 844, isMobile: true, hasTouch: true } : { width: 1440, height: 900 },
)
const errors = []
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(`http://localhost:5173/?seed=${seed}`, { waitUntil: 'networkidle0' })
await new Promise((r) => setTimeout(r, 2500))

// Lenis owns the scroll position: a native scrollTo issued while one of its
// tweens is in flight (the load nudge, most often) gets stomped on the next
// rAF. Set it, then confirm it stuck before shooting.
async function scrollTo(vh) {
  for (let attempt = 0; attempt < 10; attempt++) {
    await page.evaluate((v) => window.scrollTo(0, (v / 100) * window.innerHeight), vh)
    await new Promise((r) => setTimeout(r, 400)) // let lenis's rAF have its say
    const drift = await page.evaluate(
      (v) => Math.abs(window.scrollY - (v / 100) * window.innerHeight),
      vh,
    )
    if (drift < 2) return
  }
  console.warn(`  (warn) could not settle at ${vh}vh`)
}

for (const vh of positions) {
  await scrollTo(vh)
  await new Promise((r) => setTimeout(r, 1400)) // let lenis and labels settle
  const path = `shots/${seed}-${String(vh).padStart(3, '0')}vh${mobile ? '-mobile' : ''}.png`
  await page.screenshot({ path })
  console.log(path)
}
console.log(errors.length ? 'CONSOLE ERRORS:\n' + errors.join('\n') : 'no console errors')
await browser.close()
