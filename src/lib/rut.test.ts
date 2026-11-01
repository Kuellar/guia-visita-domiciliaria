import { expect, it } from 'vitest'
import { formatRut, isValidRut } from './rut'

it('valida y formatea RUT', () => {
  expect(isValidRut('17.654.323-K')).toBe(true)
  expect(isValidRut('9876543-3')).toBe(true)
  expect(isValidRut('9876543-4')).toBe(false)
  expect(formatRut('176543213')).toBe('17.654.321-3')
})
