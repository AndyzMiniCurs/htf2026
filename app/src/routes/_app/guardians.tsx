import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ShieldOff, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Button } from '#/components/ui/Button.tsx'
import { EmptyState } from '#/components/ui/EmptyState.tsx'
import { Input, Select } from '#/components/ui/Field.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { useToast } from '#/components/ui/Toast.tsx'
import { cx } from '#/components/ui/cx.ts'
import { getErrorCode } from '#/lib/errors.ts'
import { ROLES, createGuardianInput } from '#/lib/guardian.ts'
import { createGuardian, listGuardians, setGuardianRole } from '#/lib/guardians.functions.ts'
import type { Guardian, Role } from '#/lib/guardian.ts'

export const Route = createFileRoute('/_app/guardians')({
  // Defenders get a clear forbidden state instead of an error page.
  loader: ({ context }) => (context.me.role === 'commander' ? listGuardians() : null),
  head: () => ({ meta: [{ title: 'Guardians · Guardians of the Grid' }] }),
  component: GuardiansPage,
})

function GuardiansPage() {
  const guardians = Route.useLoaderData()
  if (!guardians) {
    return (
      <Panel className="mx-auto max-w-2xl">
        <EmptyState icon={<ShieldOff />} title="Commanders only">
          Only commanders can see and manage the guardian roster. Ask a commander if you need a new
          guardian or a role change.
        </EmptyState>
      </Panel>
    )
  }
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5">
      <div>
        <h1 className="title-gothic text-4xl sm:text-5xl">Guardians</h1>
        <p className="text-fg-muted">
          The roster of Achrona. Commanders add guardians and set roles.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Panel heading={`Roster (${guardians.length})`} flush>
          <Roster guardians={guardians} />
        </Panel>
        <Panel heading="Enlist a guardian">
          <EnlistForm />
        </Panel>
      </div>
    </div>
  )
}

function Roster({ guardians }: { guardians: Array<Guardian> }) {
  const router = useRouter()
  const toast = useToast()
  const { me } = Route.useRouteContext()
  const [busy, setBusy] = useState<number | null>(null)

  async function changeRole(guardian: Guardian, role: Role) {
    setBusy(guardian.guardianId)
    try {
      await setGuardianRole({ data: { guardianId: guardian.guardianId, role } })
      toast.show({ tone: 'success', title: `${guardian.codename} is now a ${role}` })
      await router.invalidate()
    } catch (err) {
      toast.show({
        tone: 'error',
        title: 'Role not changed',
        body:
          getErrorCode(err) === 'CONFLICT' && err instanceof Error
            ? err.message
            : 'Mission control did not answer. Try again.',
      })
    } finally {
      setBusy(null)
    }
  }

  return (
    <ul className="divide-y divide-line/70">
      {guardians.map((g) => (
        <li key={g.guardianId} className="flex items-center gap-4 px-5 py-3.5">
          <span
            className={cx(
              'title-gothic grid size-11 shrink-0 place-items-center rounded-xl border-2 text-2xl',
              g.role === 'commander'
                ? 'border-gold bg-[linear-gradient(160deg,var(--gold-deep),var(--royal-deep))]'
                : 'border-royal-hi bg-[linear-gradient(160deg,var(--royal),var(--royal-deep))]',
            )}
          >
            {g.codename.charAt(0)}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold text-fg">
              {g.codename}
              {g.guardianId === me.guardianId && (
                <span className="ml-2 text-sm font-normal text-fg-faint">(you)</span>
              )}
            </span>
          </span>
          <label className="sr-only" htmlFor={`role-${g.guardianId}`}>
            Role of {g.codename}
          </label>
          <select
            id={`role-${g.guardianId}`}
            value={g.role}
            disabled={busy === g.guardianId}
            onChange={(e) => changeRole(g, e.target.value as Role)}
            className="h-11 rounded-lg border border-line bg-field px-3 text-fg hover:border-line-strong focus:border-royal-hi focus:outline-none disabled:opacity-50"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>
                {role === 'commander' ? 'Commander' : 'Defender'}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  )
}

function EnlistForm() {
  const router = useRouter()
  const toast = useToast()
  const [errors, setErrors] = useState<Partial<Record<'codename' | 'password' | 'form', string>>>(
    {},
  )
  const [pending, setPending] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const parsed = createGuardianInput.safeParse({
      codename: form.get('codename'),
      password: form.get('password'),
      role: form.get('role'),
    })
    if (!parsed.success) {
      const next: typeof errors = {}
      for (const issue of parsed.error.issues) {
        const field = issue.path[0]
        if ((field === 'codename' || field === 'password') && !next[field])
          next[field] = issue.message
      }
      setErrors(next)
      return
    }
    setPending(true)
    setErrors({})
    try {
      const guardian = await createGuardian({ data: parsed.data })
      toast.show({ tone: 'success', title: `${guardian.codename} joined the guardians` })
      formElement.reset()
      await router.invalidate()
    } catch (err) {
      setErrors(
        getErrorCode(err) === 'CONFLICT'
          ? { codename: 'That codename is taken.' }
          : { form: 'Mission control did not answer. Try again.' },
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Input label="Codename" name="codename" autoComplete="off" required error={errors.codename} />
      <Input
        label="Password"
        name="password"
        type="password"
        autoComplete="new-password"
        hint="At least 8 characters. Share it with the guardian in person."
        required
        error={errors.password}
      />
      <Select label="Role" name="role" defaultValue="defender">
        <option value="defender">Defender</option>
        <option value="commander">Commander</option>
      </Select>
      {errors.form && (
        <p role="alert" className="text-sm font-medium text-ember">
          {errors.form}
        </p>
      )}
      <Button type="submit" loading={pending} icon={<UserPlus aria-hidden className="size-4" />}>
        Enlist
      </Button>
    </form>
  )
}
