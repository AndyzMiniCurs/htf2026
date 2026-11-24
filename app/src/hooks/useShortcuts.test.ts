import { describe, expect, it } from 'vitest'
import { isTypingTarget } from './useShortcuts.ts'

describe('isTypingTarget', () => {
  it('treats text fields as typing', () => {
    expect(isTypingTarget({ tagName: 'INPUT', type: 'search' } as unknown as EventTarget)).toBe(
      true,
    )
    expect(isTypingTarget({ tagName: 'TEXTAREA' } as unknown as EventTarget)).toBe(true)
    expect(isTypingTarget({ tagName: 'SELECT' } as unknown as EventTarget)).toBe(true)
    expect(
      isTypingTarget({ tagName: 'DIV', isContentEditable: true } as unknown as EventTarget),
    ).toBe(true)
  })

  it('lets shortcuts through on everything else', () => {
    expect(isTypingTarget({ tagName: 'BODY' } as unknown as EventTarget)).toBe(false)
    expect(isTypingTarget({ tagName: 'A' } as unknown as EventTarget)).toBe(false)
    expect(isTypingTarget({ tagName: 'INPUT', type: 'checkbox' } as unknown as EventTarget)).toBe(
      false,
    )
    expect(isTypingTarget(null)).toBe(false)
  })
})
