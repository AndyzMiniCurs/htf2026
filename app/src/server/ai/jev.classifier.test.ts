import { describe, expect, it, vi } from 'vitest'
import { createClassifier } from './classifier.ts'
import { createJevClassifier } from './jev.classifier.ts'
import { nullClassifier } from './null.classifier.ts'

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

describe('jev classifier', () => {
  it('sends a bearer-authenticated systemone request and reads a yes/no answer', async () => {
    const fetchMock = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      json({ model: 'jev-1.13.0', answers: { q: { type: 'noul', noul: 0.92 } } }),
    )
    const jev = createJevClassifier({ apiKey: 'k', fetch: fetchMock })

    expect(await jev.yesNo('Does this update say the problem is solved?')).toBe(0.92)
    const [url, init] = fetchMock.mock.calls[0] ?? []
    expect(url).toBe('https://api.typesafe.ai/v1/systemone')
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer k')
    expect(JSON.parse(String(init?.body)).questions.q.type).toBe('noul')
  })

  it('ranks choice options by probability', async () => {
    const fetchMock = vi.fn(async () =>
      json({
        answers: {
          q: { type: 'choice', choice: 'o1', probabilities: { o0: 0.1, o1: 0.85, o2: 0.05 } },
        },
      }),
    )
    const jev = createJevClassifier({ apiKey: 'k', fetch: fetchMock })

    expect(await jev.choose('Which kind?', ['portal', 'time-anomaly', 'creature'])).toEqual([
      { option: 'time-anomaly', probability: 0.85 },
      { option: 'portal', probability: 0.1 },
      { option: 'creature', probability: 0.05 },
    ])
  })

  it('scores every item in one request', async () => {
    const fetchMock = vi.fn(async () => json({ answers: { i0: { noul: 0.2 }, i1: { noul: 0.7 } } }))
    const jev = createJevClassifier({ apiKey: 'k', fetch: fetchMock })

    expect(await jev.score('How relevant?', ['a', 'b'])).toEqual([0.2, 0.7])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('returns null when the call times out', async () => {
    const hanging = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_, reject) =>
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
        ),
    )
    const jev = createJevClassifier({ apiKey: 'k', fetch: hanging, timeoutMs: 20 })

    expect(await jev.yesNo('anything?')).toBeNull()
    expect(await jev.choose('anything?', ['a'])).toBeNull()
    expect(await jev.score('anything?', ['a'])).toBeNull()
  })

  it('returns null on an HTTP error or an unexpected answer shape', async () => {
    const unauthorized = createJevClassifier({
      apiKey: 'bad',
      fetch: async () => json({ detail: { error_type: 'authentication_error' } }, 401),
    })
    const malformed = createJevClassifier({
      apiKey: 'k',
      fetch: async () => json({ answers: { q: { noul: 'yes' } } }),
    })

    expect(await unauthorized.yesNo('x?')).toBeNull()
    expect(await malformed.yesNo('x?')).toBeNull()
  })
})

describe('createClassifier', () => {
  it('uses the null classifier when no API key is set', async () => {
    const classifier = createClassifier('')
    expect(classifier).toBe(nullClassifier)
    expect(await classifier.yesNo('x?')).toBeNull()
    expect(await classifier.choose('x?', ['a'])).toBeNull()
    expect(await classifier.score('x?', ['a'])).toBeNull()
  })

  it('uses Jev when a key is set', () => {
    expect(createClassifier('k')).not.toBe(nullClassifier)
  })
})
