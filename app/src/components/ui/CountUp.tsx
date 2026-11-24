import { animate, useReducedMotion } from 'motion/react'
import { useLayoutEffect, useRef } from 'react'

/**
 * A number that rolls to its new value instead of jumping: from zero on arrival, then from
 * whatever it showed whenever live data changes it. Server markup carries the final value.
 */
export function CountUp({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const shown = useRef(0)
  const reduce = useReducedMotion()

  // Layout effect: React has just written the final value; put the old one back before paint.
  useLayoutEffect(() => {
    // Edit React's own text node in place so later renders still find it.
    const node = ref.current?.firstChild
    if (!node) return
    const write = (v: number) => {
      shown.current = v
      node.nodeValue = v.toFixed(decimals)
    }
    if (reduce) {
      write(value)
      return
    }
    write(shown.current)
    const controls = animate(shown.current, value, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: write,
    })
    return () => controls.stop()
  }, [value, decimals, reduce])

  return <span ref={ref}>{value.toFixed(decimals)}</span>
}
