// Runs plugins/turn-duration/hooks/prefs.ts's readClockPrefs against this OS's real settings, changing them scenario by scenario.
// `$` here is a stand-in with the two nouns readClockPrefs uses: process.run (no shell) and env.get.
import { spawnSync } from 'node:child_process'

import { clockFormat, type ClockPrefs } from '../../plugins/turn-duration/hooks/format'
import { readClockPrefs } from '../../plugins/turn-duration/hooks/prefs'

type Env = Record<string, string | undefined>
type Scenario = { name: string; setup?: () => void; env?: Env; expect: ClockPrefs }

const AT = new Date(2026, 9, 29, 13, 24)
const CLEARED = ['LC_ALL', 'LC_TIME', 'LANG', 'XDG_CURRENT_DESKTOP']

const sh = (argv: string[], env: Env = process.env) => {
  const r = spawnSync(argv[0]!, argv.slice(1), { encoding: 'utf8', env: env as NodeJS.ProcessEnv })
  if (r.error || r.status !== 0) throw new Error(`${argv.join(' ')} failed: ${r.error ?? r.stderr}`)
  return r.stdout
}

const engine = (env: Env) =>
  ({
    process: {
      run: async (argv: readonly string[], init?: { timeoutMs?: number }) => {
        const r = spawnSync(argv[0]!, argv.slice(1), {
          encoding: 'utf8',
          env: env as NodeJS.ProcessEnv,
          timeout: init?.timeoutMs,
        })
        if (r.error) throw r.error
        return { exitCode: r.status ?? 1, stdout: r.stdout, stderr: r.stderr }
      },
    },
    env: { get: async (name: string) => env[name] },
  }) as unknown as Parameters<typeof readClockPrefs>[0]

const baseEnv = (): Env => {
  const env: Env = { ...process.env }
  for (const key of CLEARED) delete env[key]
  return env
}

const INTL = 'HKCU\\Control Panel\\International'
const regSet = (value: string, data: string) => () => void sh(['reg', 'add', INTL, '/v', value, '/t', 'REG_SZ', '/d', data, '/f'])
const defaults = (...args: string[]) => () => {
  for (const key of ['AppleICUForce24HourTime', 'AppleICUForce12HourTime']) {
    spawnSync('defaults', ['delete', '-g', key])
  }
  if (args.length) sh(['defaults', 'write', '-g', ...args])
}
const gsettings = (value?: string) => () =>
  void sh(
    value
      ? ['gsettings', 'set', 'org.gnome.desktop.interface', 'clock-format', value]
      : ['gsettings', 'reset', 'org.gnome.desktop.interface', 'clock-format'],
  )

const SCENARIOS: Record<string, Scenario[]> = {
  win32: [
    { name: 'sShortTime HH:mm, LocaleName en-GB', setup: () => (regSet('sShortTime', 'HH:mm')(), regSet('LocaleName', 'en-GB')()), expect: { hour12: false, locale: 'en-GB' } },
    { name: 'sShortTime h:mm tt, LocaleName en-US', setup: () => (regSet('sShortTime', 'h:mm tt')(), regSet('LocaleName', 'en-US')()), expect: { hour12: true, locale: 'en-US' } },
    { name: 'sShortTime tt h:mm, LocaleName ko-KR', setup: () => (regSet('sShortTime', 'tt h:mm')(), regSet('LocaleName', 'ko-KR')()), expect: { hour12: true, locale: 'ko-KR' } },
    { name: 'sShortTime H:mm, LocaleName ja-JP', setup: () => (regSet('sShortTime', 'H:mm')(), regSet('LocaleName', 'ja-JP')()), expect: { hour12: false, locale: 'ja-JP' } },
  ],
  darwin: [
    { name: 'AppleICUForce24HourTime, AppleLocale en_US', setup: () => (defaults('AppleICUForce24HourTime', '-bool', 'true')(), sh(['defaults', 'write', '-g', 'AppleLocale', 'en_US'])), expect: { hour12: false, locale: 'en-US' } },
    { name: 'AppleICUForce12HourTime, AppleLocale en_GB', setup: () => (defaults('AppleICUForce12HourTime', '-bool', 'true')(), sh(['defaults', 'write', '-g', 'AppleLocale', 'en_GB'])), expect: { hour12: true, locale: 'en-GB' } },
    { name: 'no force, AppleLocale ko_KR@calendar=gregorian', setup: () => (defaults()(), sh(['defaults', 'write', '-g', 'AppleLocale', 'ko_KR@calendar=gregorian'])), expect: { hour12: undefined, locale: 'ko-KR' } },
  ],
  linux: [
    { name: 'LANG en_US, no desktop', setup: gsettings(), env: { LANG: 'en_US.UTF-8' }, expect: { hour12: undefined, locale: 'en-US' } },
    { name: 'LANG en_US, KDE (gsettings ignored)', env: { LANG: 'en_US.UTF-8', XDG_CURRENT_DESKTOP: 'KDE' }, expect: { hour12: undefined, locale: 'en-US' } },
    { name: 'LANG en_US, GNOME default 24h', env: { LANG: 'en_US.UTF-8', XDG_CURRENT_DESKTOP: 'ubuntu:GNOME' }, expect: { hour12: false, locale: 'en-US' } },
    { name: 'LANG en_GB, GNOME set 12h', setup: gsettings('12h'), env: { LANG: 'en_GB.UTF-8', XDG_CURRENT_DESKTOP: 'GNOME' }, expect: { hour12: true, locale: 'en-GB' } },
    { name: 'LC_ALL ja_JP over LANG ko_KR', setup: gsettings(), env: { LANG: 'ko_KR.UTF-8', LC_ALL: 'ja_JP.UTF-8' }, expect: { hour12: undefined, locale: 'ja-JP' } },
    { name: 'LC_TIME en_GB over LANG en_US', env: { LANG: 'en_US.UTF-8', LC_TIME: 'en_GB.UTF-8' }, expect: { hour12: undefined, locale: 'en-GB' } },
    { name: 'LANG C', env: { LANG: 'C' }, expect: { hour12: undefined, locale: undefined } },
  ],
}

const scenarios = SCENARIOS[process.platform]
if (!scenarios) throw new Error(`no scenarios for ${process.platform}`)

const main = async () => {
  let failed = 0
  for (const s of scenarios) {
    s.setup?.()
    const env = { ...baseEnv(), ...s.env }
    const got = await readClockPrefs(engine(env))
    const sample = clockFormat(got).format(AT).replace(/\s/g, ' ')
    const hourOk = s.expect.hour12 === undefined || (s.expect.hour12 ? !sample.includes('13') : sample.includes('13'))
    const ok = got.hour12 === s.expect.hour12 && got.locale === s.expect.locale && hourOk
    if (!ok) failed++
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${s.name.padEnd(48)} ${JSON.stringify(got).padEnd(36)} ${sample}`)
    if (!ok) console.log(`      expected ${JSON.stringify(s.expect)}`)
    // On GitHub Actions each scenario is also a check-run annotation, readable on the PR and through the API.
    if (process.env.GITHUB_ACTIONS) {
      const detail = `${JSON.stringify(got)} -> ${sample}${ok ? '' : `, expected ${JSON.stringify(s.expect)}`}`
      // Workflow commands split properties on `,` and `:`, so the title escapes them.
      const title = `${process.platform}: ${s.name}`.replace(/%/g, '%25').replace(/,/g, '%2C').replace(/:/g, '%3A')
      console.log(`::${ok ? 'notice' : 'error'} title=${title}::${detail}`)
    }
  }
  return failed
}

void main().then(failed => {
  console.log(`\n${process.platform}: ${scenarios.length - failed}/${scenarios.length} passed`)
  process.exit(failed ? 1 : 0)
})
