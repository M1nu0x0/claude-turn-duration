// CI copies plugins/turn-duration/hooks/format.ts and prefs.ts beside this file before loading it with --plugin-dir.
import type { Register } from 'claude-code'

import { clockFormat } from './format'
import { readClockPrefs } from './prefs'

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const prefs = await readClockPrefs($)
    const sample = clockFormat(prefs).format(new Date(2026, 9, 29, 13, 24))
    await $.fs.write('clock-probe.json', JSON.stringify({ prefs, sample }))
    return next(e)
  })
}
