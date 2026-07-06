/**
 * Property 4: Bilingual Name Selection
 *
 * Tests that for any result with Arabic and English names, the returned name
 * matches the user's language preference via the Accept-Language header.
 *
 * Properties tested:
 * 1. buildAcceptLanguage('ar') always starts with "ar"
 * 2. buildAcceptLanguage('en') always starts with "en"
 * 3. For any language input ('ar' or 'en'), the output contains both languages separated by comma
 * 4. The preferred language always comes first in the header value
 *
 * **Validates: Requirements 2.7**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty } from '../helpers'
import { _internal } from '@/features/geocoding/infrastructure/nominatim-client'
import type { Language } from '@/features/geocoding/domain/geocoder-types'

const { buildAcceptLanguage } = _internal

/** Arbitrary that generates a valid Language value ('ar' | 'en') */
const arbLanguage = fc.constantFrom<Language>('ar', 'en')

describe('Property 4: Bilingual Name Selection', () => {
  describe('buildAcceptLanguage starts with preferred language', () => {
    it('buildAcceptLanguage("ar") always starts with "ar"', () => {
      const result = buildAcceptLanguage('ar')
      expect(result.startsWith('ar')).toBe(true)
    })

    it('buildAcceptLanguage("en") always starts with "en"', () => {
      const result = buildAcceptLanguage('en')
      expect(result.startsWith('en')).toBe(true)
    })
  })

  describe('output contains both languages separated by comma', () => {
    it('for any language input, the output contains both "ar" and "en" separated by comma', () => {
      runProperty(
        fc.property(arbLanguage, (language) => {
          const result = buildAcceptLanguage(language)
          const parts = result.split(',')
          expect(parts).toHaveLength(2)
          expect(parts.map((p) => p.trim())).toContain('ar')
          expect(parts.map((p) => p.trim())).toContain('en')
        })
      )
    })
  })

  describe('preferred language always comes first', () => {
    it('the preferred language is always the first element in the header value', () => {
      runProperty(
        fc.property(arbLanguage, (language) => {
          const result = buildAcceptLanguage(language)
          const parts = result.split(',')
          const firstPart = parts[0].trim()
          expect(firstPart).toBe(language)
        })
      )
    })

    it('the non-preferred language is always the second element', () => {
      runProperty(
        fc.property(arbLanguage, (language) => {
          const result = buildAcceptLanguage(language)
          const parts = result.split(',')
          const secondPart = parts[1].trim()
          const otherLanguage = language === 'ar' ? 'en' : 'ar'
          expect(secondPart).toBe(otherLanguage)
        })
      )
    })
  })
})
