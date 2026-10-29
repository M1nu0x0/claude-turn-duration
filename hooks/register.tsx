import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { clockFormat, duration, keyOf, pastWord } from './format'
import { readClockPrefs } from './prefs'

const labels = atom({ plugin: 'turn-duration', key: 'labels' } as const, {})

export const register: Register = on => {
  let clock = clockFormat()

  on('session.start', async ($, e, next) => {
    void readClockPrefs($).then(prefs => {
      clock = clockFormat(prefs)
    })
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.agentId === undefined && e.answer.trim()) {
      const label = `✻ ${pastWord()} for ${duration(e.durationMs)} · done ${clock.format(await $.clock.now())}`
      await update($, labels, all => ({ ...all, [keyOf(e.answer)]: label }))
    }
    return result
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    // The terminal draws this line itself.
    if (e.surface === 'terminal' || e.props.isSummary) return next(e)
    const label = (await read($, labels))[keyOf(e.props.text)]
    if (!label) return next(e)
    const { Box, Text } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        {await next(e)}
        <Text dimColor italic>
          {label}
        </Text>
      </Box>
    )
  })
}
