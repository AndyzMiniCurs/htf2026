import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'
import { ImagePlus, LoaderCircle, MapPinned, Mic, MicOff, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { AchronaMap } from '#/components/achrona/AchronaMap.tsx'
import { HornIcon } from '#/components/icons/RealmIcons.tsx'
import { Button } from '#/components/ui/Button.tsx'
import { Textarea } from '#/components/ui/Field.tsx'
import { Panel } from '#/components/ui/Panel.tsx'
import { useToast } from '#/components/ui/Toast.tsx'
import {
  ECHO_DESCRIPTION_MAX,
  ECHO_DESCRIPTION_MIN,
  ECHO_IMAGE_MAX_BYTES,
  ECHO_IMAGE_MIMES,
} from '#/lib/echo.ts'
import { reportEcho } from '#/lib/echoes.functions.ts'
import { moderateImage } from '#/components/echoes/image-moderation.ts'
import { useSpeech } from '#/hooks/useSpeech.ts'
import { getErrorCode } from '#/lib/errors.ts'
import type { EchoImageMime } from '#/lib/echo.ts'
import type { Location } from '#/lib/glitch.ts'

export const Route = createFileRoute('/_app/echoes/new')({
  head: () => ({ meta: [{ title: 'Report an echo · Guardians of the Grid' }] }),
  component: ReportEchoPage,
})

const OUTCOME_COPY = {
  created: { title: 'A new glitch is open', body: 'Your echo tore a new rift in the quest log.' },
  grouped: {
    title: 'Echo joined a glitch',
    body: 'It matched a glitch already open, so it was added there.',
  },
  reopened: {
    title: 'A fixed glitch reopened',
    body: 'Your echo matched a glitch that had been fixed.',
  },
} as const

function ReportEchoPage() {
  const navigate = useNavigate()
  const router = useRouter()
  const toast = useToast()
  const [description, setDescription] = useState('')
  // Words still being recognised, shown after the text but not yet part of it.
  const [interim, setInterim] = useState('')
  const speech = useSpeech((text, final) => {
    if (!final) return setInterim(text)
    setInterim('')
    setDescription((d) =>
      (d.trim() ? `${d.trimEnd()} ${text}` : text).slice(0, ECHO_DESCRIPTION_MAX),
    )
  })
  const [location, setLocation] = useState<Location | null>(null)
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ description?: string; image?: string; form?: string }>({})
  const [pending, setPending] = useState(false)
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (!image) return setPreview(null)
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  async function chooseImage(file: File | undefined) {
    if (!file) return
    if (!ECHO_IMAGE_MIMES.includes(file.type as EchoImageMime)) {
      setErrors((e) => ({ ...e, image: 'Use a JPEG, PNG or WebP image.' }))
      return
    }
    if (file.size > ECHO_IMAGE_MAX_BYTES) {
      setErrors((e) => ({ ...e, image: 'Images can be at most 5 MB.' }))
      return
    }
    setErrors((e) => ({ ...e, image: undefined }))
    setChecking(true)
    const verdict = await moderateImage(file)
    setChecking(false)
    if (verdict === 'explicit') {
      setErrors((e) => ({
        ...e,
        image: 'This photo was flagged as explicit and cannot be attached.',
      }))
      return
    }
    setImage(file)
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = description.trim()
    if (text.length < ECHO_DESCRIPTION_MIN) {
      setErrors({
        description: `Describe what you saw in at least ${ECHO_DESCRIPTION_MIN} characters.`,
      })
      return
    }
    const form = new FormData()
    form.set('description', text)
    if (location) {
      form.set('x', String(location.x))
      form.set('y', String(location.y))
    }
    if (image) form.set('image', image)
    setPending(true)
    setErrors({})
    try {
      const result = await reportEcho({ data: form })
      toast.show({ tone: 'success', ...OUTCOME_COPY[result.outcome] })
      // A short double tap in the hand confirms the report landed (Android; iOS has no web vibration).
      if ('vibrate' in navigator) navigator.vibrate([12, 40, 18])
      await router.invalidate()
      await navigate({ to: '/glitches/$glitchId', params: { glitchId: result.glitchId } })
    } catch (err) {
      setErrors({
        form:
          getErrorCode(err) === 'VALIDATION' && err instanceof Error
            ? err.message
            : 'The echo did not reach mission control. Check your connection and try again.',
      })
    } finally {
      setPending(false)
    }
  }

  const length = description.trim().length
  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="title-gothic mb-1 text-4xl sm:text-5xl">Report an echo</h1>
      <p className="mb-6 max-w-[60ch] text-fg-muted">
        Tell mission control what you see. Every echo is triaged at once: it opens a glitch or joins
        one already being worked on.
      </p>

      <form onSubmit={submit} noValidate className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel heading="What is happening?">
          <div className="flex flex-col gap-5">
            <Textarea
              label="Description"
              name="description"
              value={interim ? `${description} ${interim}`.trimStart() : description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={ECHO_DESCRIPTION_MAX}
              rows={6}
              placeholder="The clock tower keeps repeating the same minute…"
              aside={`${length} / ${ECHO_DESCRIPTION_MAX}`}
              error={errors.description}
              required
            />
            {speech.supported && (
              <div className="-mt-2 flex flex-wrap items-center gap-3">
                <Button
                  variant={speech.listening ? 'danger' : 'ghost'}
                  size="sm"
                  aria-pressed={speech.listening}
                  icon={
                    speech.listening ? (
                      <MicOff aria-hidden className="size-4" />
                    ) : (
                      <Mic aria-hidden className="size-4" />
                    )
                  }
                  onClick={speech.listening ? speech.stop : speech.start}
                >
                  {speech.listening ? 'Stop dictating' : 'Dictate'}
                </Button>
                {speech.listening && (
                  <span
                    className="flex items-center gap-2 text-sm text-fg-muted"
                    aria-live="polite"
                  >
                    <span className="size-2 rounded-full bg-ember motion-safe:animate-pulse" />
                    Listening… speak your echo
                  </span>
                )}
                {speech.error && (
                  <span role="alert" className="text-sm text-ember">
                    {speech.error}
                  </span>
                )}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <span className="label-caps text-fg-muted">Photo (optional)</span>
              {preview ? (
                <div className="relative w-fit">
                  <img
                    src={preview}
                    alt="Photo to attach"
                    className="max-h-56 rounded-lg border border-line object-cover"
                  />
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setImage(null)}
                    className="absolute top-2 right-2 grid size-9 place-items-center rounded-full bg-ground/85 text-fg hover:bg-ember"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-field/60 px-4 py-5 text-center text-fg-muted transition-colors hover:border-gold hover:text-fg focus-within:border-royal-hi">
                  <ImagePlus aria-hidden className="size-7 text-gold" />
                  <span>Add a photo</span>
                  <span className="text-sm text-fg-faint">JPEG, PNG or WebP, up to 5 MB</span>
                  <input
                    type="file"
                    accept={ECHO_IMAGE_MIMES.join(',')}
                    capture="environment"
                    className="sr-only"
                    onChange={(e) => void chooseImage(e.target.files?.[0])}
                  />
                </label>
              )}
              {checking && (
                <p className="flex items-center gap-2 text-sm text-fg-muted" aria-live="polite">
                  <LoaderCircle aria-hidden className="size-4 animate-spin" />
                  Checking the photo…
                </p>
              )}
              {errors.image && (
                <p role="alert" className="text-sm font-medium text-ember">
                  {errors.image}
                </p>
              )}
            </div>
          </div>
        </Panel>

        <Panel
          heading="Where?"
          actions={
            location && (
              <Button variant="ghost" size="sm" onClick={() => setLocation(null)}>
                Clear
              </Button>
            )
          }
        >
          <AchronaMap value={location} onPick={setLocation} />
          <p className="mt-3 flex items-center gap-2 text-sm text-fg-muted">
            <MapPinned aria-hidden className="size-4 shrink-0 text-gold" />
            {location
              ? `Marked at ${location.x.toFixed(0)}, ${location.y.toFixed(0)} on the map.`
              : 'Optional: tap the map where it happens.'}
          </p>
        </Panel>

        <div className="flex flex-col gap-3 lg:col-span-2 lg:flex-row lg:items-center lg:justify-end">
          {errors.form && (
            <p
              role="alert"
              className="rounded-lg border border-ember/60 bg-ember/10 px-3 py-2 text-sm font-medium text-ember lg:mr-auto"
            >
              {errors.form}
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            loading={pending}
            disabled={checking}
            icon={<HornIcon className="size-5" />}
          >
            Send the echo
          </Button>
        </div>
      </form>
    </div>
  )
}
