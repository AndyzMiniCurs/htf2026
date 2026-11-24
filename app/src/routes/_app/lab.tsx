import { ClientOnly, createFileRoute } from '@tanstack/react-router'
import { Suspense, lazy } from 'react'
import { FAMILIAR } from '#/components/battle/familiar.ts'
import { Panel } from '#/components/ui/Panel.tsx'

// shortcut: a dev-only preview of battle pieces while they are built; remove before the pitch.
const FamiliarPreview = lazy(() => import('#/components/battle/FamiliarPreview.tsx'))

export const Route = createFileRoute('/_app/lab')({
  head: () => ({ meta: [{ title: 'Lab · Guardians of the Grid' }] }),
  component: LabPage,
})

function LabPage() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-4">
      <div>
        <h1 className="title-gothic text-4xl">
          {FAMILIAR.name}, {FAMILIAR.title}
        </h1>
        <p className="text-fg-muted">
          Drag to turn the stage. Preview of the sealing battle’s familiar.
        </p>
      </div>
      <Panel flush className="overflow-hidden">
        <div className="h-[min(70dvh,40rem)]">
          <ClientOnly fallback={null}>
            <Suspense fallback={null}>
              <FamiliarPreview />
            </Suspense>
          </ClientOnly>
        </div>
      </Panel>
    </div>
  )
}
