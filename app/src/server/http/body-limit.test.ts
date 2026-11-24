import { describe, expect, it } from 'vitest'
import { MAX_REQUEST_BYTES, rejectOversizedBody } from './body-limit.ts'

const post = (headers: Record<string, string>, body: BodyInit | null = 'x') =>
  new Request('http://localhost/_serverFn/x', { method: 'POST', headers, body })

describe('rejectOversizedBody', () => {
  it('lets bodyless requests and GETs through', () => {
    expect(rejectOversizedBody(new Request('http://localhost/'))).toBeNull()
    expect(rejectOversizedBody(post({}, null))).toBeNull()
  })

  it('accepts a body up to the limit', () => {
    expect(rejectOversizedBody(post({ 'content-length': String(MAX_REQUEST_BYTES) }))).toBeNull()
    expect(rejectOversizedBody(post({ 'content-length': '2048' }))).toBeNull()
  })

  it('refuses a declared body over the limit with 413 before reading it', () => {
    expect(
      rejectOversizedBody(post({ 'content-length': String(MAX_REQUEST_BYTES + 1) }))?.status,
    ).toBe(413)
    expect(rejectOversizedBody(post({ 'content-length': '2000000000' }))?.status).toBe(413)
  })

  it('refuses a body without a usable length', () => {
    expect(rejectOversizedBody(post({}))?.status).toBe(411)
    expect(rejectOversizedBody(post({ 'content-length': 'lots' }))?.status).toBe(413)
    expect(rejectOversizedBody(post({ 'content-length': '-5' }))?.status).toBe(413)
  })
})
