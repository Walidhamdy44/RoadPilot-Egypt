/**
 * Property 25: Auth Input Validation
 *
 * Tests that Zod schemas accept valid email, password 8-128 chars,
 * display name 1-100 chars and reject all others.
 *
 * **Validates: Requirements 20.6**
 */
import { describe, it, expect } from 'vitest'
import { fc, runProperty, arbEmail, arbPassword, arbDisplayName } from '../helpers'
import {
  emailSchema,
  passwordSchema,
  displayNameSchema,
  registerSchema,
  loginSchema,
} from '@/features/auth/domain/auth-validator'

describe('Property 25: Auth Input Validation', () => {
  describe('emailSchema', () => {
    it('accepts all valid emails', () => {
      runProperty(
        fc.property(arbEmail, (email) => {
          const result = emailSchema.safeParse(email)
          expect(result.success).toBe(true)
        })
      )
    })

    it('rejects empty strings', () => {
      const result = emailSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('rejects strings without @ symbol', () => {
      runProperty(
        fc.property(
          fc.stringMatching(/^[a-z0-9]{1,30}$/).filter((s) => !s.includes('@')),
          (str) => {
            const result = emailSchema.safeParse(str)
            expect(result.success).toBe(false)
          }
        )
      )
    })

    it('rejects strings with only @ and no domain', () => {
      runProperty(
        fc.property(
          fc.stringMatching(/^[a-z0-9]{1,10}$/).map((local) => `${local}@`),
          (email) => {
            const result = emailSchema.safeParse(email)
            expect(result.success).toBe(false)
          }
        )
      )
    })
  })

  describe('passwordSchema', () => {
    it('accepts passwords of 8-128 characters', () => {
      runProperty(
        fc.property(arbPassword, (password) => {
          const result = passwordSchema.safeParse(password)
          expect(result.success).toBe(true)
        })
      )
    })

    it('rejects passwords shorter than 8 characters', () => {
      runProperty(
        fc.property(fc.string({ minLength: 0, maxLength: 7 }), (password) => {
          const result = passwordSchema.safeParse(password)
          expect(result.success).toBe(false)
        })
      )
    })

    it('rejects passwords longer than 128 characters', () => {
      runProperty(
        fc.property(fc.string({ minLength: 129, maxLength: 256 }), (password) => {
          const result = passwordSchema.safeParse(password)
          expect(result.success).toBe(false)
        })
      )
    })
  })

  describe('displayNameSchema', () => {
    it('accepts display names of 1-100 characters', () => {
      runProperty(
        fc.property(arbDisplayName, (name) => {
          const result = displayNameSchema.safeParse(name)
          expect(result.success).toBe(true)
        })
      )
    })

    it('rejects empty display names', () => {
      const result = displayNameSchema.safeParse('')
      expect(result.success).toBe(false)
    })

    it('rejects display names longer than 100 characters', () => {
      runProperty(
        fc.property(fc.string({ minLength: 101, maxLength: 200 }), (name) => {
          const result = displayNameSchema.safeParse(name)
          expect(result.success).toBe(false)
        })
      )
    })
  })

  describe('registerSchema', () => {
    it('accepts valid registration payloads', () => {
      runProperty(
        fc.property(arbEmail, arbPassword, arbDisplayName, (email, password, displayName) => {
          const result = registerSchema.safeParse({ email, password, displayName })
          expect(result.success).toBe(true)
        })
      )
    })

    it('rejects registration with invalid email', () => {
      runProperty(
        fc.property(arbPassword, arbDisplayName, (password, displayName) => {
          const result = registerSchema.safeParse({
            email: 'not-an-email',
            password,
            displayName,
          })
          expect(result.success).toBe(false)
        })
      )
    })

    it('rejects registration with short password', () => {
      runProperty(
        fc.property(arbEmail, arbDisplayName, (email, displayName) => {
          const result = registerSchema.safeParse({
            email,
            password: 'short',
            displayName,
          })
          expect(result.success).toBe(false)
        })
      )
    })

    it('rejects registration with empty display name', () => {
      runProperty(
        fc.property(arbEmail, arbPassword, (email, password) => {
          const result = registerSchema.safeParse({
            email,
            password,
            displayName: '',
          })
          expect(result.success).toBe(false)
        })
      )
    })
  })

  describe('loginSchema', () => {
    it('accepts valid login payloads', () => {
      runProperty(
        fc.property(arbEmail, arbPassword, (email, password) => {
          const result = loginSchema.safeParse({ email, password })
          expect(result.success).toBe(true)
        })
      )
    })

    it('rejects login with invalid email', () => {
      runProperty(
        fc.property(arbPassword, (password) => {
          const result = loginSchema.safeParse({ email: '', password })
          expect(result.success).toBe(false)
        })
      )
    })

    it('rejects login with short password', () => {
      runProperty(
        fc.property(arbEmail, (email) => {
          const result = loginSchema.safeParse({ email, password: 'abc' })
          expect(result.success).toBe(false)
        })
      )
    })
  })
})
