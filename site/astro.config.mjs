// The GitHub Pages site. Everything about it, in every language, is in src/site.json; the shared layout,
// SEO head, sitemap and build checks come from @m1nu0x0/claude-plugin-site.
import { defineConfig } from 'astro/config'
import pluginSite from '@m1nu0x0/claude-plugin-site'

export default defineConfig({
  integrations: [pluginSite()],
})
