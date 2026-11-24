import { describe, expect, it, vi } from 'vitest'
import { isFor, publish, subscribe, toSse } from './bus.ts'
import type { Envelope } from './bus.ts'

describe('event bus', () => {
  it('delivers published events to subscribers until they unsubscribe', () => {
    const listener = vi.fn()
    const unsubscribe = subscribe(listener)
    publish({ type: 'glitch.created', glitchId: 'GL-0200' })
    unsubscribe()
    publish({ type: 'glitch.updated', glitchId: 'GL-0200' })

    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener).toHaveBeenCalledWith({
      event: { type: 'glitch.created', glitchId: 'GL-0200' },
      to: null,
    })
  })

  it('keeps delivering when one listener throws', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const good = vi.fn()
    const offBad = subscribe(() => {
      throw new Error('broken stream')
    })
    const offGood = subscribe(good)
    publish({ type: 'lockdown', on: true })
    offBad()
    offGood()
    warn.mockRestore()

    expect(good).toHaveBeenCalledTimes(1)
  })

  it('sends targeted notifications only to their guardian', () => {
    const notification: Envelope = {
      event: { type: 'notification', notification: { kind: 'assigned', text: 'GL-0200 is yours' } },
      to: 2,
    }
    expect(isFor(notification, 2)).toBe(true)
    expect(isFor(notification, 3)).toBe(false)
    expect(isFor({ event: { type: 'lockdown', on: true }, to: null }, 3)).toBe(true)
  })

  it('formats one SSE message per event', () => {
    expect(toSse({ type: 'lockdown', on: false })).toBe('data: {"type":"lockdown","on":false}\n\n')
  })
})
