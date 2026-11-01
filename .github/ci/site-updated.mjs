// Warns when a pull request changes what the site says but not `updated` in site/i18n.json, which is the
// sitemap's lastmod. Search engines trust lastmod only while it stays accurate.
//   node .github/ci/site-updated.mjs <base commit>
// Only the words count: site/i18n.json without `updated`, and the text of site/index.html outside <style>
// and <script>. A style or script change alone does not need a new date.
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'

const base = process.argv[2]
const show = path => {
  try { return execFileSync('git', ['show', `${base}:${path}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }) }
  catch { return null }
}
const words = html => html.replace(/<(style|script)\b[\s\S]*?<\/\1>/g, '')
const strings = json => { const { updated, ...rest } = JSON.parse(json); return { updated, rest: JSON.stringify(rest) } }

const oldI18n = show('site/i18n.json'), oldPage = show('site/index.html')
if (oldI18n === null || oldPage === null) process.exit(0) // the base has no site/ yet
const before = strings(oldI18n), after = strings(readFileSync('site/i18n.json', 'utf8'))
const changed = before.rest !== after.rest || words(oldPage) !== words(readFileSync('site/index.html', 'utf8'))
if (changed && before.updated === after.updated) {
  console.log(`::warning file=site/i18n.json,title=updated not changed::The site's text changed but "updated" is still ${after.updated}. Set it to today's date (it is the sitemap's lastmod) and run node site/build.mjs.`)
}
