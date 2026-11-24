import { describe, expect, it, vi } from 'vitest'
import { createOpenRouterClassifier } from './openrouter.classifier.ts'

/** A chat completion whose message content is `content` serialised as JSON. */
const reply = (content: unknown, status = 200) =>
  new Response(
    JSON.stringify({
      choices: [{ message: { role: 'assistant', content: JSON.stringify(content) } }],
    }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )

describe('openrouter classifier', () => {
  it('sends a bearer-authenticated JSON-mode request and reads a yes/no answer', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      reply({ yes: 0.92 }),
    )
    const ai = createOpenRouterClassifier({ apiKey: 'k', fetch: fetchMock })

    expect(await ai.yesNo('Does this update say the problem is solved?')).toBe(0.92)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer k')
    expect(JSON.parse(String(init?.body)).response_format).toEqual({ type: 'json_object' })
  })

  it('ranks choice options by probability', async () => {
    const ai = createOpenRouterClassifier({
      apiKey: 'k',
      fetch: async () => reply({ probabilities: { o0: 0.1, o1: 0.85, o2: 0.05 } }),
    })

    expect(await ai.choose('Which kind?', ['portal', 'time-anomaly', 'creature'])).toEqual([
      { option: 'time-anomaly', probability: 0.85 },
      { option: 'portal', probability: 0.1 },
      { option: 'creature', probability: 0.05 },
    ])
  })

  it('scores every item in one request and rejects a wrong count', async () => {
    const fetchMock = vi.fn(async () => reply({ scores: [0.2, 0.7] }))
    const ai = createOpenRouterClassifier({ apiKey: 'k', fetch: fetchMock })

    expect(await ai.score('How relevant?', ['a', 'b'])).toEqual([0.2, 0.7])
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(await ai.score('How relevant?', ['a', 'b', 'c'])).toBeNull()
  })

  it('returns null when the call times out', async () => {
    const hanging = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
        ),
    )
    const ai = createOpenRouterClassifier({ apiKey: 'k', fetch: hanging, timeoutMs: 20 })

    expect(await ai.yesNo('anything?')).toBeNull()
    expect(await ai.choose('anything?', ['a'])).toBeNull()
    expect(await ai.score('anything?', ['a'])).toBeNull()
  })

  it('returns null on an HTTP error, non-JSON content or an out-of-range number', async () => {
    const unauthorized = createOpenRouterClassifier({
      apiKey: 'bad',
      fetch: async () => reply({ error: { message: 'No auth credentials found' } }, 401),
    })
    const notJson = createOpenRouterClassifier({
      apiKey: 'k',
      fetch: async () =>
        new Response(JSON.stringify({ choices: [{ message: { content: 'Yes, probably.' } }] })),
    })
    const outOfRange = createOpenRouterClassifier({
      apiKey: 'k',
      fetch: async () => reply({ yes: 7 }),
    })

    expect(await unauthorized.yesNo('x?')).toBeNull()
    expect(await notJson.yesNo('x?')).toBeNull()
    expect(await outOfRange.yesNo('x?')).toBeNull()
  })
})
