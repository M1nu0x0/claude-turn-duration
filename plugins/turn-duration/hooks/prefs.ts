import type { EngineInterface } from 'claude-code'

import { type ClockPrefs, isGnome, linuxPrefs, macPrefs, mergePrefs, windowsPrefs } from './format'

// Reads the OS's clock settings. No OS check: a command that is not there, or fails, reads as unset.
export async function readClockPrefs($: EngineInterface): Promise<ClockPrefs> {
  const run = (argv: string[]) =>
    $.process.run(argv, { timeoutMs: 5_000 }).then(
      r => (r.exitCode === 0 ? r.stdout : undefined),
      () => undefined,
    )
  const env = (value: Promise<string | undefined>) => value.catch(() => undefined)
  const mac = (key: string) => run(['defaults', 'read', '-g', key])
  const win = (value: string) => run(['reg', 'query', 'HKCU\\Control Panel\\International', '/v', value])

  const desktop = await env($.env.get('XDG_CURRENT_DESKTOP'))

  const all = await Promise.all([
    Promise.all([mac('AppleICUForce24HourTime'), mac('AppleICUForce12HourTime'), mac('AppleLocale')]).then(
      ([force24, force12, locale]) => macPrefs(force24, force12, locale),
    ),
    Promise.all([win('sShortTime'), win('LocaleName')]).then(([shortTime, locale]) => windowsPrefs(shortTime, locale)),
    Promise.all([
      env($.env.get('LC_ALL')),
      env($.env.get('LC_TIME')),
      env($.env.get('LANG')),
      isGnome(desktop) ? run(['gsettings', 'get', 'org.gnome.desktop.interface', 'clock-format']) : undefined,
    ]).then(([lcAll, lcTime, lang, gnome]) => linuxPrefs(lcAll, lcTime, lang, gnome, desktop)),
  ])
  return mergePrefs(...all)
}
