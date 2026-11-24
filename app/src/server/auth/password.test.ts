import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password.ts'

describe('password', () => {
  it('accepts the correct password', async () => {
    expect(await verifyPassword('guardian-pass', await hashPassword('guardian-pass'))).toBe(true)
  })

  it('rejects a wrong password', async () => {
    expect(await verifyPassword('wrong-pass', await hashPassword('guardian-pass'))).toBe(false)
  })

  it('salts every hash, so two hashes of the same password differ', async () => {
    const [a, b] = await Promise.all([hashPassword('same'), hashPassword('same')])
    expect(a).not.toBe(b)
    expect(await verifyPassword('same', a)).toBe(true)
    expect(await verifyPassword('same', b)).toBe(true)
  })

  it('rejects malformed stored hashes instead of throwing', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false)
    expect(await verifyPassword('x', 'bcrypt$abc$def')).toBe(false)
  })
})
