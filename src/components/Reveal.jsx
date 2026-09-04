import { useEffect, useRef } from 'react'

export default function Reveal({
  as: Tag = 'div',
  className = '',
  delay = 0,
  children,
  ...props
}) {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return undefined

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        const wait = Number(el.dataset.delay || delay || 0)
        window.setTimeout(() => {
          el.classList.add('in-view')
        }, wait)
        observer.unobserve(el)
      },
      { threshold: 0.15 },
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [delay])

  return (
    <Tag
      ref={ref}
      className={`reveal-text ${className}`.trim()}
      data-delay={delay}
      {...props}
    >
      {children}
    </Tag>
  )
}
