// Builds the GitHub Pages site in docs/ from site/: one pre-rendered page per language and the sitemap.
//   node site/build.mjs           writes docs/index.html, docs/ko/index.html, docs/ja/index.html, docs/sitemap.xml
// Edit site/index.html, site/i18n.json, site/redirect.js or site/runtime.js, never the generated files; CI fails
// if they drift. The plugin's version comes from its plugin.json, so a version bump needs a rebuild too.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const docs = join(here, '..', 'docs')
const { site, updated, languages } = JSON.parse(readFileSync(join(here, 'i18n.json'), 'utf8'))
const template = readFileSync(join(here, 'index.html'), 'utf8')
const redirect = readFileSync(join(here, 'redirect.js'), 'utf8').trimEnd()
const runtime = readFileSync(join(here, 'runtime.js'), 'utf8').trimEnd()
const { version } = JSON.parse(readFileSync(join(here, '..', 'plugins', 'turn-duration', '.claude-plugin', 'plugin.json'), 'utf8'))
const LANGS = Object.keys(languages)

const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const text = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const json = s => JSON.stringify(s).replace(/</g, '\\u003c')
// A path from one language page to another, relative so the links follow wherever docs/ is served from.
// The hero as the page is first drawn, before site/runtime.js plays it with the visitor's own clock: the
// same seconds runtime.js works out from its typing speed, and the time 2:48 PM in the page's language.
const LOCALES = { en: 'en-US', ko: 'ko-KR', ja: 'ja-JP' }
const BUBBLE_AT = 100, ANSWER_AT = 450, ANSWER_MS = 22.5 / 0.7
const heroLine = (lang, answer) => {
  const secs = Math.max(1, Math.round((ANSWER_AT - BUBBLE_AT + Array.from(answer).length * ANSWER_MS) / 1000))
  const clock = new Intl.DateTimeFormat(LOCALES[lang], { hour: 'numeric', minute: '2-digit' }).format(new Date(2026, 0, 1, 14, 48))
  return `✻ Worked for ${secs}s · done ${clock}`
}
const rel = (from, to) => from === to ? './' : (languages[from].path ? '../' : './') + languages[to].path
// The hreflang alternates, the same on every page and in the sitemap; x-default is the English page at /.
const alternates = LANGS.map(l => [l, site + languages[l].path]).concat([['x-default', site]])

function render(lang) {
  const L = languages[lang]
  const t = L.strings
  const url = site + L.path
  const fields = {
    lang,
    site,
    version,
    updated,
    font: L.font.replace(/ /g, '+'),
    // Each language's page, relative to this one, for the head script's redirect.
    pages: attr(JSON.stringify(Object.fromEntries(LANGS.map(l => [l, rel(lang, l)])))),
    // The other languages, each offered in its own words when it is the visitor's browser language.
    offers: attr(JSON.stringify(Object.fromEntries(LANGS.filter(l => l !== lang)
      .map(l => [l, { ...languages[l].suggest, href: rel(lang, l) }])))),
    alternates: alternates.map(([l, href]) => `<link rel="alternate" hreflang="${l}" href="${href}">`).join('\n'),
    title: text(L.title),
    description: attr(L.description),
    url,
    ogTitle: attr(L.ogTitle),
    ogDescription: attr(L.ogDescription),
    ogImage: L.ogImage,
    ogImageAlt: attr(L.ogImageAlt),
    ogLocale: L.ogLocale,
    ogLocaleAlternates: LANGS.filter(l => l !== lang)
      .map(l => `<meta property="og:locale:alternate" content="${languages[l].ogLocale}">`)
      .join('\n'),
    ldDescription: json(L.description),
    copied: attr(t.copied),
    ask: text(t.ask),
    answer: text(t.answer),
    line: text(heroLine(lang, t.answer)),
  }
  let html = template.replace('/*REDIRECT*/', () => redirect).replace('/*RUNTIME*/', () => runtime)
  html = html.replace(/\{\{(\w+)\}\}/g, (m, key) => {
    if (!(key in fields)) throw new Error(`site/index.html: unknown placeholder ${m}`)
    return fields[key]
  })

  // Text: an element with data-i18n="key" gets t[key] as its content. No such element nests one of its own tag.
  html = html.replace(/(<(\w+)\b[^>]*\sdata-i18n="(\w+)"[^>]*>)([\s\S]*?)(<\/\2>)/g, (m, open, tag, key, _, close) => {
    if (!(key in t)) throw new Error(`${lang}: no string for data-i18n="${key}"`)
    return open + t[key] + close
  })
  html = html.replace(/(\sdata-i18n-aria="(\w+)"[^>]*?\saria-label=")[^"]*"/g, (m, head, key) => {
    if (!(key in t)) throw new Error(`${lang}: no string for data-i18n-aria="${key}"`)
    return head + attr(t[key]) + '"'
  })
  html = html.replace(/(\sdata-i18n-alt="(\w+)"[^>]*?\salt=")[^"]*"/g, (m, head, key) => {
    if (!(key in t)) throw new Error(`${lang}: no string for data-i18n-alt="${key}"`)
    return head + attr(t[key]) + '"'
  })
  // Language links: real links, so crawlers find every language page, with the current one marked.
  html = html.replace(/<a data-lang-link="(\w+)"/g, (m, to) =>
    `${m} href="${rel(lang, to)}"${to === lang ? ' aria-current="page"' : ''}`)

  const left = html.match(/\{\{\w+\}\}|data-i18n="(\w+)">\s*<\/|\/\*(REDIRECT|RUNTIME)\*\//)
  if (left) throw new Error(`${lang}: left over in the page: ${left[0]}`)
  return html
}

for (const lang of LANGS) {
  const out = join(docs, languages[lang].path, 'index.html')
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, render(lang))
}

const links = alternates.map(([l, href]) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${href}"/>`).join('\n')
const urls = LANGS.map(l => `  <url>
    <loc>${site + languages[l].path}</loc>
    <lastmod>${updated}</lastmod>
${links}
  </url>`).join('\n')
writeFileSync(join(docs, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`)
