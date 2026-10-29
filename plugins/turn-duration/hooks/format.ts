// The terminal's TurnDuration hands its sampled word to terminal hooks alone, so other surfaces pick from a list of their own.
const WORDS = ['Baked', 'Brewed', 'Churned', 'Cogitated', 'Cooked', 'Crunched', 'Sautéed', 'Worked']

export const pastWord = (random = Math.random()) => WORDS[Math.floor(random * WORDS.length)] ?? 'Worked'

export const duration = (ms: number) => {
  const s = Math.round(ms / 1000)
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
}

// Each OS keeps the 12/24-hour switch outside the locale the runtime defaults to, so the OS's own settings are read.
export type ClockPrefs = { hour12?: boolean; locale?: string }

// `ko_KR.UTF-8`, `en_KR@calendar=gregorian` → `ko-KR`, `en-KR`; `C` and `POSIX` name no locale.
export const toLocale = (raw?: string) => {
  const name = raw?.trim().split(/[.@]/)[0]?.replace(/_/g, '-')
  return name && name !== 'C' && name !== 'POSIX' ? name : undefined
}

// macOS: `defaults read -g AppleICUForce24HourTime`, `AppleICUForce12HourTime`, `AppleLocale`.
export const macPrefs = (force24?: string, force12?: string, appleLocale?: string): ClockPrefs => ({
  hour12: force24?.trim() === '1' ? false : force12?.trim() === '1' ? true : undefined,
  locale: toLocale(appleLocale),
})

// Windows: `reg query "HKCU\Control Panel\International" /v sShortTime` and `/v LocaleName`.
const regValue = (out?: string) => out?.match(/REG_SZ[ \t]+(.*)$/m)?.[1]?.trim()

export const windowsPrefs = (shortTimeOut?: string, localeNameOut?: string): ClockPrefs => {
  // `HH:mm` is 24-hour, `h:mm tt` and `tt h:mm` are 12-hour; quoted text is literal.
  const pattern = regValue(shortTimeOut)?.replace(/'[^']*'/g, '')
  return {
    hour12: pattern === undefined ? undefined : /H/.test(pattern) ? false : /h/.test(pattern) ? true : undefined,
    locale: toLocale(regValue(localeNameOut)),
  }
}

// Linux: `LC_ALL`, `LC_TIME`, `LANG`, and GNOME's `gsettings get org.gnome.desktop.interface clock-format`.
// gsettings answers its schema default ('24h') wherever glib is installed, so it counts only on a GNOME desktop.
export const isGnome = (desktop?: string) => /gnome/i.test(desktop ?? '')

export const linuxPrefs = (
  lcAll?: string,
  lcTime?: string,
  lang?: string,
  gnomeClock?: string,
  desktop?: string,
): ClockPrefs => {
  const clock = isGnome(desktop) ? gnomeClock?.trim().replace(/'/g, '') : undefined
  return {
    hour12: clock === '24h' ? false : clock === '12h' ? true : undefined,
    locale: toLocale(lcAll) ?? toLocale(lcTime) ?? toLocale(lang),
  }
}

// The first source that has a value wins, field by field.
export const mergePrefs = (...all: ClockPrefs[]): ClockPrefs => ({
  hour12: all.find(p => p.hour12 !== undefined)?.hour12,
  locale: all.find(p => p.locale !== undefined)?.locale,
})

export const clockFormat = ({ hour12, locale }: ClockPrefs = {}) => {
  try {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit', hour12 })
  } catch {
    return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12 })
  }
}

// The drawn block and the stored answer can differ at their edges, so they are matched on a trimmed tail.
export const keyOf = (text: string) => text.trim().slice(-200)
