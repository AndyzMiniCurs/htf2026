import { createFileRoute, redirect, useRouter } from '@tanstack/react-router'
import { KeyRound } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { z } from 'zod'
import { AchronaDiorama } from '#/components/achrona/AchronaDiorama.tsx'
import { Crest } from '#/components/layout/Crest.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { Input } from '#/components/ui/Field.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { login } from '#/lib/auth.functions.ts'
import { getErrorCode } from '#/lib/errors.ts'

export const Route = createFileRoute('/login')({
  validateSearch: z.object({ redirect: z.string().optional() }),
  beforeLoad: ({ context, search }) => {
    if (context.me) throw redirect({ href: search.redirect ?? '/' })
  },
  head: () => ({ meta: [{ title: 'Enter Achrona · Guardians of the Grid' }] }),
  component: LoginPage,
})

/** The gate of Achrona: the world drifts behind, the guardian gives codename and password. */
function LoginPage() {
  const router = useRouter()
  const { redirect: back } = Route.useSearch()
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setPending(true)
    setError(null)
    try {
      await login({
        data: { codename: String(form.get('codename')), password: String(form.get('password')) },
      })
      await router.invalidate()
      await router.navigate({ href: back ?? '/' })
    } catch (err) {
      setError(
        getErrorCode(err) === 'UNAUTHORIZED' || getErrorCode(err) === 'VALIDATION'
          ? 'Invalid codename or password.'
          : 'The gate did not answer. Check your connection and try again.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <main className="relative grid min-h-dvh overflow-hidden lg:grid-cols-[minmax(0,1fr)_32rem]">
      <div aria-hidden className="absolute inset-0">
        <AchronaDiorama
          glitches={[]}
          highlightedId={null}
          onHighlight={() => {}}
          onSelect={() => {}}
          dragon
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        transition={{ duration: 1.1, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none relative z-10 flex flex-col justify-end p-6 pb-0 sm:p-10 lg:justify-center lg:pb-10"
      >
        <Crest className="mb-5 size-16 drop-shadow-[0_6px_18px_rgb(165_43_217/0.6)] lg:size-24" />
        <h1 className="title-gothic text-5xl sm:text-6xl lg:text-[5.5rem]">
          Guardians
          <br />
          of the Grid
        </h1>
        <p className="mt-4 max-w-[34ch] font-serif text-lg text-frost sm:text-xl">
          The Desync is tearing at Achrona. Take your post, guardian.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 flex items-end p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:p-10 lg:items-center"
      >
        <Panel
          heading="Enter Achrona"
          className="w-full bg-[color-mix(in_oklab,var(--panel)_88%,transparent)] backdrop-blur-md"
        >
          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <Input
              label="Codename"
              name="codename"
              autoComplete="username"
              required
              autoCapitalize="none"
              spellCheck={false}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-ember/60 bg-ember/10 px-3 py-2 text-sm font-medium text-ember"
              >
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              loading={pending}
              icon={<KeyRound aria-hidden className="size-5" />}
              className="mt-2 w-full"
            >
              Take your post
            </Button>
          </form>
        </Panel>
      </motion.div>
    </main>
  )
}
