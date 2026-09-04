import { useEffect, useRef, useState } from 'react'

export default function AnimatedCounter({ end, label, suffix = '' }) {
  const [value, setValue] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started.current) return
        started.current = true

        const duration = 1200
        const start = performance.now()

        const tick = (now) => {
          const progress = Math.min(1, (now - start) / duration)
          setValue(Math.round(end * progress))
          if (progress < 1) requestAnimationFrame(tick)
        }

        requestAnimationFrame(tick)
      },
      { threshold: 0.4 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [end])

  return (
    <div className="stat-item" ref={ref}>
      <span className="counter-number">
        {value}
        {suffix}
      </span>
      <span className="counter-label">{label}</span>
    </div>
  )
}
