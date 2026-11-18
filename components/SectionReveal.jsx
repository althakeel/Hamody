'use client'

import { useLayoutEffect, useRef, useState } from 'react'

function motionReduced() {
  return typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function SectionReveal({ children, className = '', delay = 0 }) {
  const ref = useRef(null)
  const [phase, setPhase] = useState('idle')

  useLayoutEffect(() => {
    const node = ref.current
    if (!node || motionReduced()) return undefined

    const reveal = () => setPhase('in')
    const top = node.getBoundingClientRect().top
    if (top <= window.innerHeight * 0.92) {
      reveal()
      return undefined
    }

    setPhase('wait')
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      reveal()
      observer.disconnect()
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const motionClass = phase === 'wait'
    ? 'translate-y-4 opacity-0'
    : phase === 'in'
      ? 'hm-section-in'
      : ''

  return (
    <div
      ref={ref}
      className={`${motionClass} ${className}`.trim()}
      style={phase === 'in' && delay ? { animationDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  )
}
