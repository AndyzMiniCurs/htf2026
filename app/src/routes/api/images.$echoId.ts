import { createFileRoute } from '@tanstack/react-router'
import { currentGuardian } from '#/server/auth/session.ts'
import { getEchoImage } from '#/server/echoes/echoes.service.ts'

/** Image bytes of an echo, only for signed-in guardians. */
export const Route = createFileRoute('/api/images/$echoId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!(await currentGuardian())) return new Response('Unauthorized', { status: 401 })
        const echoId = Number(params.echoId)
        const image = Number.isSafeInteger(echoId) && echoId > 0 ? await getEchoImage(echoId) : null
        if (!image) return new Response('Not found', { status: 404 })
        return new Response(new Uint8Array(image.bytes), {
          headers: {
            'Content-Type': image.mime,
            'Cache-Control': 'private, max-age=86400',
            'X-Content-Type-Options': 'nosniff',
          },
        })
      },
    },
  },
})
