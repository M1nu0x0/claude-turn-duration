import { expect, test } from 'claude-code/testing'

import { clockFormat, duration, linuxPrefs, macPrefs, mergePrefs, toLocale, windowsPrefs } from '../hooks/format'

const AT = new Date(2026, 9, 29, 13, 24)
const ANSWER = '여기까지 정리했습니다.'
const LABEL = '✻ Churned for 36s · done 13:24'
const MESSAGE = {
  plugin: 'turn-duration',
  component: 'AssistantMessage',
  requestId: 'msg-1',
  props: { text: ANSWER, isFirstOfReply: true },
} as const

test('the macOS forced 24-hour switch draws 13:24', () => {
  const clock = clockFormat(macPrefs('1\n', undefined, 'en_KR\n'))

  expect(clock.format(AT)).toBe('13:24')
})

test('the macOS forced 12-hour switch draws 1:24 pm in en_GB', () => {
  const clock = clockFormat(macPrefs(undefined, '1\n', 'en_GB\n'))

  expect(clock.format(AT)).toBe('1:24 pm')
})

test('a Windows HH:mm short time draws 13:24', () => {
  const prefs = windowsPrefs(
    '\r\nHKEY_CURRENT_USER\\Control Panel\\International\r\n    sShortTime    REG_SZ    HH:mm\r\n\r\n',
    '\r\nHKEY_CURRENT_USER\\Control Panel\\International\r\n    LocaleName    REG_SZ    en-GB\r\n\r\n',
  )

  expect(prefs).toEqual({ hour12: false, locale: 'en-GB' })
  expect(clockFormat(prefs).format(AT)).toBe('13:24')
})

test('a Windows tt h:mm short time is 12-hour, and quoted text is not read as a pattern', () => {
  expect(windowsPrefs('    sShortTime    REG_SZ    tt h:mm\r\n').hour12).toBe(true)
  expect(windowsPrefs("    sShortTime    REG_SZ    HH'h'mm\r\n").hour12).toBe(false)
  expect(windowsPrefs(undefined, undefined)).toEqual({ hour12: undefined, locale: undefined })
})

test('Linux reads LC_ALL before LC_TIME before LANG, and GNOME 12h draws 1:24 pm', () => {
  const prefs = linuxPrefs(undefined, 'en_GB.UTF-8', 'ko_KR.UTF-8', "'12h'\n", 'ubuntu:GNOME')

  expect(prefs).toEqual({ hour12: true, locale: 'en-GB' })
  expect(clockFormat(prefs).format(AT)).toBe('1:24 pm')
  expect(linuxPrefs('ja_JP.UTF-8', 'en_GB.UTF-8', 'ko_KR.UTF-8').locale).toBe('ja-JP')
})

test("gsettings' clock-format counts only on a GNOME desktop", () => {
  expect(linuxPrefs(undefined, undefined, 'en_US.UTF-8', "'24h'\n", 'KDE').hour12).toBeUndefined()
  expect(linuxPrefs(undefined, undefined, 'en_US.UTF-8', "'24h'\n").hour12).toBeUndefined()
  expect(linuxPrefs(undefined, undefined, 'en_US.UTF-8', "'24h'\n", 'GNOME').hour12).toBe(false)
})

test('C and POSIX name no locale', () => {
  expect([toLocale('C'), toLocale('C.UTF-8'), toLocale('POSIX'), toLocale('ko_KR@euro')]).toEqual([
    undefined,
    undefined,
    undefined,
    'ko-KR',
  ])
})

test('the first source with a value wins, field by field', () => {
  const merged = mergePrefs({ locale: 'en-KR' }, { hour12: false, locale: 'ja-JP' }, { hour12: true })

  expect(merged).toEqual({ hour12: false, locale: 'en-KR' })
})

test('an unreadable locale falls back to the default', () => {
  const clock = clockFormat({ locale: 'not a locale' })

  expect(clock.format(AT)).toMatch(/1:24|13:24/)
})

test('a turn reads in seconds under a minute and in minutes and seconds past it', () => {
  const shown = [4_000, 59_400, 64_000].map(duration)

  expect(shown).toEqual(['4s', '59s', '1m 4s'])
})

test('the block that ends a timed answer gets a dim italic line under it on desktop', async ($, on) => {
  on('state.get', { key: 'labels' }, () => ({ value: { value: { [ANSWER]: LABEL }, version: 1 } }))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })

  const block = await $.ui.mount({ ...MESSAGE, surface: 'desktop' })

  const texts = await block.findAll({ type: 'Text' })
  expect(texts.map(found => [found.text, found.props.dimColor, found.props.italic])).toEqual([
    [ANSWER, undefined, undefined],
    [LABEL, true, true],
  ])
})

test('the terminal keeps its own drawing', async ($, on) => {
  on('state.get', { key: 'labels' }, () => ({ value: { value: { [ANSWER]: LABEL }, version: 1 } }))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })

  const block = await $.ui.mount({ ...MESSAGE, surface: 'terminal' })

  expect((await block.findAll({ type: 'Text' })).map(found => found.text)).toEqual([ANSWER])
})

test('a block that ends no timed answer is drawn as it was', async ($, on) => {
  on('state.get', { key: 'labels' }, () => ({ value: { value: { [ANSWER]: LABEL }, version: 1 } }))
  on('ui.render', { component: 'AssistantMessage' }, ($, e) => {
    const { Text } = $.ui.resolve(e)
    return <Text>{e.props.text}</Text>
  })

  const block = await $.ui.mount({ ...MESSAGE, props: { text: '중간 설명입니다.', isFirstOfReply: true }, surface: 'desktop' })

  expect((await block.findAll({ type: 'Text' })).map(found => found.text)).toEqual(['중간 설명입니다.'])
})
