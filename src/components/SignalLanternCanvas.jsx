import { useEffect, useRef } from 'react'

function rand(min, max) {
  return min + Math.random() * (max - min)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

/**
 * Sticky night-sky lantern behind post-hero content.
 * Hover brightens the flame; scroll drifts the lantern through stages.
 */
export default function SignalLanternCanvas({ sectionRef }) {
  const canvasRef = useRef(null)
  const hostRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const host = hostRef.current
    if (!canvas || !host) return undefined

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined

    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return undefined

    const mobile = window.matchMedia('(max-width: 768px), (pointer: coarse)').matches

    let w = 0
    let h = 0
    const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 2)

    const stars = []
    const sparks = []
    const trail = []
    const embers = []

    let scrollP = 0
    let smoothP = 0
    let flamePulse = 0
    let hover = 0
    let mouseX = 0.5
    let mouseY = 0.5
    let pointerIn = false
    let raf = 0
    let last = performance.now()

    const resize = () => {
      w = Math.max(1, host.clientWidth)
      h = Math.max(1, host.clientHeight)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      if (stars.length === 0) {
        const count = Math.floor((w * h) / (mobile ? 7000 : 4800))
        for (let i = 0; i < count; i++) {
          stars.push({
            x: Math.random() * w,
            y: Math.random() * h,
            r: rand(0.35, 1.6),
            a: rand(0.12, 0.75),
            tw: rand(0.4, 2.2),
            ph: Math.random() * Math.PI * 2,
          })
        }
      } else {
        for (const s of stars) {
          s.x = (s.x / Math.max(w, 1)) * w || Math.random() * w
          s.y = (s.y / Math.max(h, 1)) * h || Math.random() * h
        }
      }
    }

    const updateScroll = () => {
      const section = sectionRef?.current
      if (!section) return
      const rect = section.getBoundingClientRect()
      const total = Math.max(1, rect.height - window.innerHeight)
      scrollP = Math.min(1, Math.max(0, -rect.top / total))
    }

    const onMove = (e) => {
      const rect = host.getBoundingClientRect()
      if (e.clientY < rect.top || e.clientY > rect.bottom) {
        pointerIn = false
        return
      }
      pointerIn = true
      mouseX = (e.clientX - rect.left) / Math.max(rect.width, 1)
      mouseY = (e.clientY - rect.top) / Math.max(rect.height, 1)
    }

    const onTouch = (e) => {
      const t = e.touches[0]
      if (!t) return
      onMove(t)
    }

    const onLeave = () => {
      pointerIn = false
    }

    const spawnSpark = (x, y, intensity) => {
      const count = Math.floor(rand(1, 3) * intensity)
      for (let i = 0; i < count; i++) {
        sparks.push({
          x: x + rand(-8, 8),
          y: y + rand(0, 12),
          vx: rand(-50, 50),
          vy: rand(30, 140),
          life: rand(0.3, 0.95),
          age: 0,
          size: rand(1, 3),
          hue: rand(18, 48),
        })
      }
    }

    const spawnTrail = (x, y, intensity) => {
      trail.push({
        x: x + rand(-6, 6),
        y: y + rand(4, 16),
        vx: rand(-14, 14),
        vy: rand(18, 70),
        life: rand(0.45, 1.1),
        age: 0,
        size: rand(5, 14) * intensity,
      })
    }

    const spawnEmber = (x, y) => {
      embers.push({
        x: x + rand(-10, 10),
        y: y + rand(0, 16),
        vx: rand(-16, 16),
        vy: rand(24, 90),
        life: rand(0.7, 1.8),
        age: 0,
        size: rand(0.7, 2),
      })
    }

    const lanternLayout = (p, elapsed) => {
      const stage = p * 2
      let nx = 0.5
      let ny = 0.48
      let scale = Math.min(1.2, 0.88 + (w / 1400) * 0.28)

      if (stage < 1) {
        const t = stage
        nx = lerp(0.5, 0.28, t)
        ny = lerp(0.48, 0.42, t)
        scale *= lerp(1, 0.92, t)
      } else {
        const t = stage - 1
        nx = lerp(0.28, 0.72, t)
        ny = lerp(0.42, 0.46, t)
        scale *= lerp(0.92, 0.95, t)
      }

      const bob = Math.sin(elapsed * 0.0018) * 6
      const sway = Math.sin(elapsed * 0.0014) * 0.035
      return {
        x: nx * w + Math.sin(elapsed * 0.0011) * 8,
        y: ny * h + bob,
        scale,
        sway,
      }
    }

    const drawSky = (elapsed) => {
      const g = ctx.createLinearGradient(0, 0, 0, h)
      g.addColorStop(0, '#05060c')
      g.addColorStop(0.4, '#0a0c16')
      g.addColorStop(0.75, '#10131f')
      g.addColorStop(1, '#18121c')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, w, h)

      const hg = ctx.createRadialGradient(w * 0.5, h * 1.05, 0, w * 0.5, h * 1.05, w * 0.75)
      hg.addColorStop(0, 'rgba(90, 42, 18, 0.2)')
      hg.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = hg
      ctx.fillRect(0, 0, w, h)

      for (const s of stars) {
        const twinkle = 0.55 + 0.45 * Math.sin(elapsed * 0.001 * s.tw + s.ph)
        ctx.beginPath()
        ctx.fillStyle = `rgba(255, 236, 210, ${s.a * twinkle})`
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawParticles = () => {
      for (const p of trail) {
        const a = 1 - p.age / p.life
        const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size)
        rg.addColorStop(0, `rgba(255, 210, 120, ${0.5 * a})`)
        rg.addColorStop(0.4, `rgba(255, 120, 40, ${0.3 * a})`)
        rg.addColorStop(1, 'rgba(80, 20, 0, 0)')
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      for (const p of sparks) {
        const a = 1 - p.age / p.life
        ctx.beginPath()
        ctx.fillStyle = `hsla(${p.hue}, 100%, ${55 + a * 25}%, ${a})`
        ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2)
        ctx.fill()
      }

      for (const p of embers) {
        const a = 1 - p.age / p.life
        ctx.beginPath()
        ctx.fillStyle = `rgba(255, ${140 + a * 80}, 60, ${a * 0.85})`
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawFlame = (intensity) => {
      const flicker = 1 + Math.sin(flamePulse) * 0.08 + Math.sin(flamePulse * 2.3) * 0.05
      const base = 20 * intensity * flicker
      const plumeH = 48 * intensity * flicker
      const plumeW = 16 * Math.min(intensity, 2.8)

      const plume = ctx.createRadialGradient(0, 16, 2, 0, plumeH * 0.85, Math.max(55, 36 * intensity))
      plume.addColorStop(0, `rgba(255, 250, 210, ${Math.min(1, 0.8 * intensity)})`)
      plume.addColorStop(0.25, `rgba(255, 180, 60, ${Math.min(1, 0.5 * intensity)})`)
      plume.addColorStop(0.6, `rgba(255, 80, 20, ${Math.min(0.85, 0.25 * intensity)})`)
      plume.addColorStop(1, 'rgba(40, 10, 0, 0)')
      ctx.fillStyle = plume
      ctx.beginPath()
      ctx.ellipse(0, plumeH * 0.65, plumeW, plumeH, 0, 0, Math.PI * 2)
      ctx.fill()

      for (let i = 0; i < 3; i++) {
        const ox = Math.sin(flamePulse * 1.5 + i) * (3 + i)
        const oy = 12 + i * 9
        const rg = ctx.createRadialGradient(ox, oy, 0, ox, oy, base * (1 - i * 0.2))
        rg.addColorStop(0, `rgba(255, 245, 200, ${Math.min(1, 0.88 - i * 0.2)})`)
        rg.addColorStop(0.45, `rgba(255, 150, 40, ${Math.min(1, 0.5 - i * 0.1)})`)
        rg.addColorStop(1, 'rgba(180, 40, 0, 0)')
        ctx.fillStyle = rg
        ctx.beginPath()
        ctx.arc(ox, oy, base * (1 - i * 0.15), 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const drawLantern = (layout, intensity) => {
      const { x, y, scale, sway } = layout

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(sway)
      ctx.scale(scale, scale)

      const bloom = ctx.createRadialGradient(0, 12, 4, 0, 18, 150 + hover * 40)
      bloom.addColorStop(0, `rgba(255, 170, 60, ${Math.min(0.8, 0.32 * intensity)})`)
      bloom.addColorStop(0.45, `rgba(200, 90, 20, ${Math.min(0.45, 0.11 * intensity)})`)
      bloom.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = bloom
      ctx.beginPath()
      ctx.arc(0, 18, 150 + hover * 30, 0, Math.PI * 2)
      ctx.fill()

      drawFlame(intensity)

      ctx.fillStyle = '#2a1c12'
      ctx.beginPath()
      ctx.moveTo(-22, -38)
      ctx.quadraticCurveTo(0, -52, 22, -38)
      ctx.lineTo(18, -32)
      ctx.quadraticCurveTo(0, -42, -18, -32)
      ctx.closePath()
      ctx.fill()

      ctx.strokeStyle = '#c89a4a'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(0, -32, 20, 4, 0, 0, Math.PI * 2)
      ctx.stroke()

      const body = ctx.createLinearGradient(-28, -30, 28, 40)
      body.addColorStop(0, '#5a3018')
      body.addColorStop(0.35, `rgba(255, ${140 + intensity * 40}, 50, 0.95)`)
      body.addColorStop(0.55, `rgba(255, 200, 110, ${0.72 + intensity * 0.2})`)
      body.addColorStop(0.75, `rgba(255, ${120 + intensity * 50}, 40, 0.9)`)
      body.addColorStop(1, '#3a1a0c')
      ctx.fillStyle = body
      ctx.beginPath()
      ctx.moveTo(-26, -30)
      ctx.quadraticCurveTo(-32, 5, -24, 38)
      ctx.quadraticCurveTo(0, 46, 24, 38)
      ctx.quadraticCurveTo(32, 5, 26, -30)
      ctx.quadraticCurveTo(0, -38, -26, -30)
      ctx.closePath()
      ctx.fill()

      const inner = ctx.createRadialGradient(0, 8, 2, 0, 10, 36)
      inner.addColorStop(0, `rgba(255, 240, 180, ${0.5 * intensity})`)
      inner.addColorStop(0.5, `rgba(255, 140, 40, ${0.22 * intensity})`)
      inner.addColorStop(1, 'rgba(0, 0, 0, 0)')
      ctx.fillStyle = inner
      ctx.beginPath()
      ctx.ellipse(0, 8, 18, 28, 0, 0, Math.PI * 2)
      ctx.fill()

      ctx.strokeStyle = 'rgba(90, 50, 20, 0.55)'
      ctx.lineWidth = 1.2
      ;[-14, 0, 14].forEach((rx) => {
        ctx.beginPath()
        ctx.moveTo(rx * 0.85, -30)
        ctx.quadraticCurveTo(rx, 5, rx * 0.75, 38)
        ctx.stroke()
      })
      ctx.beginPath()
      ctx.ellipse(0, 4, 27, 6, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = '#b8893f'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.ellipse(0, 38, 24, 5, 0, 0, Math.PI * 2)
      ctx.stroke()

      ctx.strokeStyle = '#8a6a3a'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(0, 42)
      ctx.lineTo(0, 52)
      ctx.stroke()

      ctx.restore()
    }

    const drawVignette = () => {
      const vg = ctx.createRadialGradient(w * 0.5, h * 0.45, h * 0.18, w * 0.5, h * 0.5, h * 0.9)
      vg.addColorStop(0, 'rgba(0,0,0,0)')
      vg.addColorStop(1, 'rgba(0,0,0,0.5)')
      ctx.fillStyle = vg
      ctx.fillRect(0, 0, w, h)
    }

    const tick = (now) => {
      raf = requestAnimationFrame(tick)
      const dt = Math.min((now - last) / 1000, 0.05)
      last = now
      const elapsed = now

      smoothP += (scrollP - smoothP) * (1 - Math.exp(-dt * 3.2))
      flamePulse += dt * 14

      const layout = lanternLayout(smoothP, elapsed)

      const dx = mouseX * w - layout.x
      const dy = mouseY * h - layout.y
      const dist = Math.hypot(dx, dy)
      const near = Math.max(0, 1 - dist / (Math.min(w, h) * 0.32))
      const targetHover = pointerIn ? near : 0
      hover += (targetHover - hover) * (1 - Math.exp(-dt * 6))

      const intensity = 0.72 + Math.sin(flamePulse) * 0.08 + hover * 0.85

      if (Math.random() < 0.35 + hover * 0.55) {
        spawnSpark(layout.x, layout.y + 26 * layout.scale, intensity * (0.6 + hover))
      }
      if (hover > 0.15 && Math.random() < hover * 0.7) {
        spawnTrail(layout.x, layout.y + 30 * layout.scale, 0.7 + hover)
      }
      if (Math.random() < 0.25 + hover * 0.45) {
        spawnEmber(layout.x, layout.y + 22 * layout.scale)
      }

      for (let i = sparks.length - 1; i >= 0; i--) {
        const p = sparks[i]
        p.age += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 35 * dt
        p.vx *= 0.985
        if (p.age >= p.life) sparks.splice(i, 1)
      }
      for (let i = trail.length - 1; i >= 0; i--) {
        const p = trail[i]
        p.age += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 22 * dt
        p.size *= 0.992
        if (p.age >= p.life) trail.splice(i, 1)
      }
      for (let i = embers.length - 1; i >= 0; i--) {
        const p = embers[i]
        p.age += dt
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += 18 * dt
        if (p.age >= p.life) embers.splice(i, 1)
      }

      while (sparks.length > 120) sparks.shift()
      while (trail.length > 40) trail.shift()
      while (embers.length > 60) embers.shift()

      drawSky(elapsed)
      drawParticles()
      drawLantern(layout, intensity)
      drawVignette()
    }

    resize()
    updateScroll()
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    window.addEventListener('scroll', updateScroll, { passive: true })
    window.addEventListener('resize', updateScroll, { passive: true })
    window.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('mouseleave', onLeave)
    raf = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('scroll', updateScroll)
      window.removeEventListener('resize', updateScroll)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('mouseleave', onLeave)
    }
  }, [sectionRef])

  return (
    <div className="signal-canvas-host" ref={hostRef} aria-hidden="true">
      <canvas ref={canvasRef} className="signal-webgl signal-lantern-canvas" />
      <div className="signal-scanlines" />
    </div>
  )
}
