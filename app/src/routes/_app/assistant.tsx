import { Link, createFileRoute } from '@tanstack/react-router'
import { Brain, SendHorizontal } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { Fragment, useEffect, useRef, useState } from 'react'
import { Panel } from '#/components/ui/Panel.tsx'
import { cx } from '#/components/ui/cx.ts'
import { askAssistant } from '#/lib/assistant.functions.ts'
import type { AssistantAnswer, Intent } from '#/lib/assistant.ts'

export const Route = createFileRoute('/_app/assistant')({
  head: () => ({ meta: [{ title: 'Oracle · Guardians of the Grid' }] }),
  component: OraclePage,
})

const STARTERS = [
  'What is going on right now?',
  'How much magic is left?',
  'Who is working on GL-0142?',
  'What should I do about GL-0139?',
]

const INTENT_LABEL: Record<Intent, string> = {
  'active-summary': 'summary of active glitches',
  'glitch-status': 'status of a glitch',
  'glitch-assignee': 'who is assigned',
  'magic-level': 'magic level',
  'glitch-runbook': 'what to do (runbook)',
  foresight: 'what is coming',
  'assign-glitch': 'assign a glitch',
  'advance-glitch': 'advance a glitch',
  'report-echo': 'report an echo',
  'set-lockdown': 'lockdown',
  unknown: 'something I cannot answer yet',
}

type MessageBody =
  | { from: 'guardian'; text: string }
  | { from: 'oracle'; answer: AssistantAnswer }
  | { from: 'error'; text: string }
type Message = MessageBody & { id: number }

/**
 * The Oracle answers questions about live incidents. The AI only recognises what is asked;
 * every answer is built from mission control's data, so it never makes anything up.
 */
function OraclePage() {
  const [messages, setMessages] = useState<Array<Message>>([])
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState(false)
  const nextId = useRef(0)
  const end = useRef<HTMLDivElement>(null)

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pending])

  async function ask(text: string) {
    const q = text.trim()
    if (!q || pending) return
    const push = (m: MessageBody) => setMessages((all) => [...all, { ...m, id: nextId.current++ }])
    push({ from: 'guardian', text: q })
    setQuestion('')
    setPending(true)
    try {
      push({ from: 'oracle', answer: await askAssistant({ data: { question: q } }) })
    } catch {
      push({ from: 'error', text: 'The Oracle is silent. Check your connection and ask again.' })
    } finally {
      setPending(false)
    }
  }

  const lastAnswer = [...messages].reverse().find((m) => m.from === 'oracle')
  const suggestions =
    lastAnswer?.from === 'oracle' && lastAnswer.answer.suggestions.length > 0
      ? lastAnswer.answer.suggestions
      : STARTERS

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4">
      <div>
        <h1 className="title-gothic text-4xl sm:text-5xl">The Oracle</h1>
        <p className="max-w-[60ch] text-fg-muted">
          Ask about what is happening in Achrona. The Oracle reads mission control's records, so
          every answer comes from live data.
        </p>
      </div>

      <Panel
        flush
        className="flex h-[calc(100dvh-25rem)] min-h-[19rem] flex-col lg:h-[calc(100dvh-16rem)]"
        bodyClassName="flex min-h-0 flex-1 flex-col"
      >
        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
          {messages.length === 0 && <Welcome />}
          <ol className="flex flex-col gap-4">
            {messages.map((m) => (
              <li key={m.id}>
                <Bubble message={m} />
              </li>
            ))}
            {pending && (
              <li>
                <Thinking />
              </li>
            )}
          </ol>
          <div ref={end} />
        </div>

        <div className="border-t border-line px-4 pt-3 pb-4 sm:px-6">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1" aria-label="Suggested questions">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                disabled={pending}
                onClick={() => void ask(s)}
                className="h-11 shrink-0 rounded-full border border-line px-3.5 text-sm lg:h-9 whitespace-nowrap text-fg-muted transition-colors hover:border-gold hover:text-fg disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void ask(question)
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="oracle-question" className="sr-only">
              Your question
            </label>
            <input
              id="oracle-question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={500}
              autoComplete="off"
              enterKeyHint="send"
              placeholder="Ask the Oracle…"
              className="h-12 min-w-0 flex-1 rounded-full border border-line bg-field px-5 text-base text-fg placeholder:text-fg-faint focus:border-royal-hi focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Ask"
              disabled={pending || !question.trim()}
              className="grid size-12 shrink-0 place-items-center rounded-full bg-royal text-on-accent transition-colors hover:bg-royal-hi disabled:opacity-45"
            >
              <SendHorizontal aria-hidden className="size-5" />
            </button>
          </form>
        </div>
      </Panel>
    </div>
  )
}

function Welcome() {
  return (
    <div className="mx-auto mb-6 flex max-w-md flex-col items-center gap-3 text-center">
      <img
        src="/icons/realm/oracle.webp"
        alt=""
        width={96}
        height={96}
        className="size-24 rounded-2xl shadow-[0_0_40px_-8px_var(--royal-hi)]"
      />
      <p className="font-serif text-lg text-fg">
        “Ask, guardian. I see every echo, every rift, every guardian at their post.”
      </p>
    </div>
  )
}

function Bubble({ message }: { message: Message }) {
  if (message.from === 'guardian') {
    return (
      <p className="ml-auto w-fit max-w-[80%] rounded-2xl rounded-br-sm bg-royal px-4 py-2.5 text-on-accent">
        {message.text}
      </p>
    )
  }
  if (message.from === 'error') {
    return (
      <p
        role="alert"
        className="w-fit max-w-[80%] rounded-2xl border border-ember/60 bg-ember/10 px-4 py-2.5 text-fg"
      >
        {message.text}
      </p>
    )
  }
  const { answer } = message
  return (
    <div className="flex max-w-[88%] gap-3">
      <img
        src="/icons/realm/oracle.webp"
        alt=""
        width={36}
        height={36}
        className="size-9 shrink-0 rounded-lg"
      />
      <div className="flex flex-col gap-1.5">
        <p
          className={cx(
            'w-fit rounded-2xl rounded-tl-sm border px-4 py-2.5 font-serif text-[1.02rem] leading-relaxed text-fg',
            answer.intent === 'unknown'
              ? 'border-line bg-ground-2'
              : 'border-line-strong bg-panel-hi',
          )}
        >
          <LinkedText text={answer.text} glitchIds={answer.glitchIds} />
        </p>
        <span className="flex items-center gap-1.5 text-xs text-fg-faint">
          <Brain aria-hidden className="size-3.5 text-curse-hi" />
          Understood as: {INTENT_LABEL[answer.intent]}
        </span>
      </div>
    </div>
  )
}

/** Turns the glitch ids the answer names into links to their pages. */
function LinkedText({ text, glitchIds }: { text: string; glitchIds: Array<string> }) {
  if (glitchIds.length === 0) return <>{text}</>
  const pattern = new RegExp(`(${glitchIds.map((id) => id.replace(/[-]/g, '\\-')).join('|')})`, 'g')
  return (
    <>
      {text.split(pattern).map((part, i) =>
        glitchIds.includes(part) ? (
          <Link
            key={i}
            to="/glitches/$glitchId"
            params={{ glitchId: part }}
            className="font-gothic font-bold text-gold-hi underline decoration-gold/50 underline-offset-2 hover:decoration-gold"
          >
            {part}
          </Link>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

function Thinking() {
  const reduce = useReducedMotion()
  return (
    <div className="flex items-center gap-3" aria-label="The Oracle is reading the records">
      <img
        src="/icons/realm/oracle.webp"
        alt=""
        width={36}
        height={36}
        className="size-9 rounded-lg"
      />
      <span className="flex gap-1.5 rounded-2xl border border-line-strong bg-panel-hi px-4 py-3.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="size-2 rounded-full bg-royal-hi"
            animate={reduce ? undefined : { opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
    </div>
  )
}
