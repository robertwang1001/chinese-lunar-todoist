import { expect, it } from 'vitest'
import { localeFromLanguages } from './i18n'

it('maps browser language to supported Chinese locales with an English fallback', () => {
  expect(localeFromLanguages(['zh-CN'])).toBe('zh-CN')
  expect(localeFromLanguages(['zh-Hans-SG'])).toBe('zh-CN')
  expect(localeFromLanguages(['zh-TW'])).toBe('zh-TW')
  expect(localeFromLanguages(['zh-Hant-HK'])).toBe('zh-TW')
  expect(localeFromLanguages(['fr-FR', 'zh-CN'])).toBe('zh-CN')
  expect(localeFromLanguages(['fr-FR', 'de-DE'])).toBe('en')
  expect(localeFromLanguages([])).toBe('en')
})
