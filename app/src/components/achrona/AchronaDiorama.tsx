import { ClientOnly } from '@tanstack/react-router'
import { useReducedMotion } from 'motion/react'
import { Component, Suspense, lazy, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import type { AchronaSceneProps } from './AchronaScene.tsx'

// three.js is heavy: load the scene only in the browser, after the page is interactive.
const AchronaScene = lazy(() => import('./AchronaScene.tsx'))

const PHONE = '(max-width: 767px)'
export function useIsPhone() {
  return useSyncExternalStore(
    (onChange) => {
      const query = matchMedia(PHONE)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => matchMedia(PHONE).matches,
    () => false,
  )
}

/** The 3D world of Achrona: floating districts around the citadel, a rift over every open glitch. */
export function AchronaDiorama(props: Omit<AchronaSceneProps, 'reducedMotion' | 'lowPower'>) {
  const reducedMotion = useReducedMotion() ?? false
  const lowPower = useIsPhone()
  const fallback = <DioramaPlaceholder />
  return (
    <div className="relative h-full w-full">
      <ClientOnly fallback={fallback}>
        <SceneBoundary fallback={fallback}>
          <Suspense fallback={fallback}>
            <AchronaScene {...props} reducedMotion={reducedMotion} lowPower={lowPower} />
          </Suspense>
        </SceneBoundary>
      </ClientOnly>
    </div>
  )
}

function DioramaPlaceholder() {
  return (
    <div className="grid h-full place-items-center bg-ground">
      <div className="size-48 rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--curse)_45%,transparent),transparent_70%)] motion-safe:animate-pulse" />
    </div>
  )
}

/** A failed WebGL context or model load costs the world view, never the page around it. */
export class SceneBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('Achrona scene failed; showing the static backdrop instead.', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
