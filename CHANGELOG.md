# Changelog

All notable changes to this project are recorded here. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- The screenshots on the Korean and Japanese pages did not load: they pointed at `images/` relative to `/ko/` and `/ja/`

### Changed

- The site uses [claude-plugin-site](https://github.com/M1nu0x0/claude-plugin-site) v0.1.1, whose code is now type checked; the pages it builds are the same
- Dependabot waits 7 days after a release before proposing an update (`cooldown: default-days: 7`), so a malicious release that is pulled within a week never reaches a pull request; security updates skip the wait
- The site has one pre-rendered page per language (`/`, `/ko/`, `/ja/`) instead of one page that switched language in the browser, so search engines and link previews read each language without running JavaScript; each page has its own canonical URL, title, description, Open Graph tags, link-preview image and JSON-LD, the language switch is plain links, and the old `?lang=` links go to the matching page
- The site no longer switches by browser language: it offers that language's page in a small bar at the bottom, and only `/` goes to a language the visitor chose before, from a script in `<head>`
- The titles, descriptions and first lines say what people search for (response time, how long Claude took, plugin), and two new questions cover seeing the time in Claude Desktop and the Churned/Crunched words
- Each page loads only the fonts its language uses
- The site is built with Astro and the shared kit [claude-plugin-site](https://github.com/M1nu0x0/claude-plugin-site): its words are in `site/src/site.json`, and a GitHub Actions workflow builds and deploys it instead of committing the HTML to `docs/`; the build checks every page as a crawler reads it (title and description length, canonical, hreflang, Open Graph, JSON-LD, links and images, HTML validity) and fails on any problem; CI warns when the text changes without a new `lastmod`
- The sitemap lists the three pages with `lastmod`
- The README translations moved from `docs/` to the repository root, so the site does not publish them; each README links to the site in its own language and describes its screenshots
- `plugin.json` points `homepage` at the site, says what the plugin shows in plain words, and adds the keywords `claude-code`, `plugin` and `response-time`

## [0.1.1] - 2026-10-29

### Added

- GitHub Pages site in Korean, English and Japanese
- Badges and links to the website, releases and changelog in the READMEs
- Daily CI run against the latest Claude Code, and Dependabot updates for GitHub Actions

### Changed

- The plugin moved to `plugins/turn-duration/`, and the marketplace lists it as `./plugins/turn-duration`, so claude.ai's Add marketplace can sync the repository

## [0.1.0] - 2026-10-29

### Added

- The `✻ <word> for <duration> · done <time>` line beneath answers on surfaces other than the terminal, such as Claude Desktop
- The clock follows the 12/24-hour setting and locale on macOS, Windows and Linux
- CI on Ubuntu, Windows and macOS, and a check that a release tag matches the plugin's version

[Unreleased]: https://github.com/M1nu0x0/claude-turn-duration/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/M1nu0x0/claude-turn-duration/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/M1nu0x0/claude-turn-duration/releases/tag/v0.1.0
