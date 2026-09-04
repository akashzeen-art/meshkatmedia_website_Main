import { useEffect, useRef } from 'react'

/**
 * Ember ring cursor — sharp center + lagged outline.
 */
export default function Atmosphere() {
  const ringRef = useRef(null)
  const dotRef = useRef(null)
  const mouse = useRef({ x: -100, y: -100 })
  const ring = useRef({ x: -100, y: -100 })
  const raf = useRef(0)
  const hovering = useRef(false)

  useEffect(() => {
    const finePointer = window.matchMedia('(pointer: fine)').matches
    if (!finePointer) return undefined

    const interactive = 'a, button, .cta-btn, .logo, input, textarea, select, [role="button"]'

    const onMove = (e) => {
      mouse.current.x = e.clientX
      mouse.current.y = e.clientY
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%, -50%)`
      }
      document.body.classList.add('cursor-active')

      const target = e.target?.closest?.(interactive)
      const next = Boolean(target)
      if (next !== hovering.current) {
        hovering.current = next
        document.body.classList.toggle('cursor-hover', next)
      }
    }

    const onLeave = () => {
      document.body.classList.remove('cursor-active', 'cursor-hover')
      hovering.current = false
    }

    const onDown = () => document.body.classList.add('cursor-down')
    const onUp = () => document.body.classList.remove('cursor-down')

    const animate = () => {
      ring.current.x += (mouse.current.x - ring.current.x) * 0.14
      ring.current.y += (mouse.current.y - ring.current.y) * 0.14
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x}px, ${ring.current.y}px) translate(-50%, -50%)`
      }
      raf.current = requestAnimationFrame(animate)
    }

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('mouseup', onUp)
    raf.current = requestAnimationFrame(animate)

    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mouseup', onUp)
      cancelAnimationFrame(raf.current)
      document.body.classList.remove('cursor-active', 'cursor-hover', 'cursor-down')
    }
  }, [])

  return (
    <>
      <div className="noise" aria-hidden="true" />
      <div className="cursor-ring" ref={ringRef} aria-hidden="true" />
      <div className="cursor-dot" ref={dotRef} aria-hidden="true" />
    </>
  )
}
