// Scan seeds and report each tide's time-of-day, weather, and swell amplitude
// — the tool for curating the notable-tides list (src/ui/NotableTides.tsx).
// Requires the dev server: `npm run dev` in another terminal.
//
//   npm run probe             scan 60 derived seeds
//   npm run probe -- 120      scan more
//
// Pipe through grep/sort to hunt a mood:  npm run probe | grep "night wind"
// Set CHROME to your Chrome binary if not on macOS.
import puppeteer from 'puppeteer-core'

const CHROME = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const count = Number(process.argv[2] ?? 60)

// deterministic scan list (no Math.random — repo rule holds for tooling too)
const seeds = []
for (let i = 0; i < count; i++) {
  const s = Math.abs(Math.imul(i + 7, 2654435761) >>> 8)
    .toString(36)
    .padStart(8, '0')
    .slice(0, 8)
  seeds.push(`${s.slice(0, 4)}-${s.slice(4)}`)
}

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'shell' })
const page = await browser.newPage()
for (const seed of seeds) {
  await page.goto(`http://localhost:5173/?seed=${seed}&debug`, { waitUntil: 'networkidle0' })
  const text = await page.evaluate(() => document.body.innerText)
  const time = text.match(/\b(dawn|overcast|afternoon|dusk|night)\b/)?.[1] ?? '?'
  const weather = text.match(/\b(clear|haze|rain|wind|snow)\b/)?.[1] ?? '?'
  const amp = text.match(/amplitude[^0-9]*([\d.]+)/i)?.[1]?.slice(0, 5) ?? '?'
  console.log(seed, time, weather, 'amp', amp)
}
await browser.close()
