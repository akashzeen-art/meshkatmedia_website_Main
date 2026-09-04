import { useRef } from 'react'
import { Link } from 'react-router-dom'

export default function MagneticButton({
  to,
  children,
  className = '',
  type = 'button',
  ...props
}) {
  const ref = useRef(null)

  const onMove = (e) => {
    const btn = ref.current
    if (!btn) return
    const rect = btn.getBoundingClientRect()
    const deltaX = (e.clientX - (rect.left + rect.width / 2)) * 0.35
    const deltaY = (e.clientY - (rect.top + rect.height / 2)) * 0.35
    btn.style.transform = `translate(${deltaX}px, ${deltaY}px)`
  }

  const onEnter = () => {
    if (ref.current) {
      ref.current.style.transition =
        'transform 0.1s linear, background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease'
    }
  }

  const onLeave = () => {
    if (ref.current) {
      ref.current.style.transform = 'translate(0px, 0px)'
      ref.current.style.transition =
        'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), background 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease'
    }
  }

  const shared = {
    ref,
    className: `cta-btn ${className}`.trim(),
    onMouseMove: onMove,
    onMouseEnter: onEnter,
    onMouseLeave: onLeave,
    ...props,
  }

  const inner = (
    <>
      <span className="btn-text">{children}</span>
      <span className="btn-arrow" aria-hidden="true">
        →
      </span>
    </>
  )

  if (to) {
    return (
      <Link to={to} {...shared}>
        {inner}
      </Link>
    )
  }

  return (
    <button type={type} {...shared}>
      {inner}
    </button>
  )
}
