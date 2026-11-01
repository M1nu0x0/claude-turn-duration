// Draws the link-preview images (docs/images/og.png, og-ko.png, og-ja.png) from site/og.html and the
// ask, answer, ogImageLine, ogImageText and font of each language in site/i18n.json. Not part of node site/build.mjs and not
// checked by CI, since it needs a browser: run it by hand when those strings change, and commit the PNGs.
//   node site/og.mjs      needs Playwright and its Chromium (npm i -g playwright && npx playwright install chromium)
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const { chromium } = createRequire(import.meta.url)('playwright')
const here = dirname(fileURLToPath(import.meta.url))
const { languages } = JSON.parse(readFileSync(join(here, 'i18n.json'), 'utf8'))
const template = readFileSync(join(here, 'og.html'), 'utf8')
const text = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } })
for (const [lang, L] of Object.entries(languages)) {
  const fields = { lang, font: L.font.replace(/ /g, '+'), fontName: L.font, ask: text(L.strings.ask), answer: text(L.strings.answer), line: text(L.ogImageLine), text: text(L.ogImageText) }
  const html = template.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in fields)) throw new Error(`site/og.html: unknown placeholder ${m}`)
    return fields[key]
  })
  await page.setContent(html, { waitUntil: 'networkidle' })
  await page.evaluate(() => document.fonts.ready)
  const out = join(here, '..', 'docs', L.ogImage)
  await page.screenshot({ path: out })
  console.log(out)
}
await browser.close()
