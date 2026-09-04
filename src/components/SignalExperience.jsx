import { useEffect, useRef, useState } from 'react'
import SignalLanternCanvas from './SignalLanternCanvas.jsx'
import Reveal from './Reveal.jsx'

const stages = [
  {
    id: 'connect',
    num: '01 / 03',
    tag: 'Connect',
    title: (
      <>
        Networks that
        <br />
        never sleep.
      </>
    ),
    body: 'End-to-end telecom platforms, messaging, and carrier partnerships — a living lantern of connections across 18 countries.',
    stats: [
      { n: '18', l: 'Countries' },
      { n: '25+', l: 'Years' },
      { n: '∞', l: 'Signals' },
    ],
  },
  {
    id: 'create',
    num: '02 / 03',
    tag: 'Create',
    title: (
      <>
        Content with
        <br />
        a pulse.
      </>
    ),
    body: 'Digital marketing, social, and branded storytelling built for attention — designed to move with the same energy as the networks we run.',
    align: 'right',
  },
  {
    id: 'grow',
    num: '03 / 03',
    tag: 'Grow',
    title: (
      <>
        From signal
        <br />
        to scale.
      </>
    ),
    body: 'Move your cursor across the lantern. Each fragment lifts on a hinge axis, exposing the luminous wireframe core — scroll to orbit through Meshkat’s world.',
    features: [
      'Voronoi decomposition · GLSL + JS',
      'Barycentric wireframe · UnrealBloom',
      'PBR stone · normal + roughness maps',
      'Realtime scroll orbit · spring peel',
    ],
  },
]

/**
 * Sticky lantern backdrop from after hero through the rest of the page.
 * Pass remaining homepage sections as children.
 */
export default function SignalExperience({ children }) {
  const sectionRef = useRef(null)
  const [active, setActive] = useState(0)
  const [showHint, setShowHint] = useState(true)

  useEffect(() => {
    const section = sectionRef.current
    if (!section) return undefined

    const panels = [...section.querySelectorAll('.signal-panel')]
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const idx = Number(entry.target.dataset.idx || 0)
          setActive(idx)
          setShowHint(idx === 0)
        }
      },
      { threshold: 0.4, rootMargin: '-10% 0px -10% 0px' },
    )
    panels.forEach((p) => io.observe(p))

    const rest = section.querySelector('.signal-rest')
    let restIo
    if (rest) {
      restIo = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setShowHint(false)
        },
        { threshold: 0.05 },
      )
      restIo.observe(rest)
    }

    return () => {
      io.disconnect()
      restIo?.disconnect()
    }
  }, [])

  return (
    <section className="signal-experience" ref={sectionRef} aria-label="Lantern experience">
      <div className="signal-sticky">
        <SignalLanternCanvas sectionRef={sectionRef} />
        <div className="signal-hud" aria-hidden="true">
          <div className="signal-hud-corner signal-hud-tl" />
          <div className="signal-hud-corner signal-hud-br" />
          <p className={`signal-hint${showHint ? ' is-visible' : ''}`}>
            ↑ hover the surface to interact ↑
          </p>
          <div className="signal-stage-dots">
            {stages.map((s, i) => (
              <span key={s.id} className={`signal-dot${i === active ? ' is-active' : ''}`} />
            ))}
          </div>
        </div>
      </div>

      <div className="signal-scroll">
        {stages.map((stage, index) => (
          <div
            key={stage.id}
            className={`signal-panel${stage.align === 'right' ? ' is-right' : ''}`}
            data-idx={index}
            id={`signal-${stage.id}`}
          >
            <div className="signal-panel-inner">
              <Reveal as="p" className="signal-num">
                {stage.num}
              </Reveal>
              <Reveal as="p" className="signal-tag" delay={40}>
                {stage.tag}
              </Reveal>
              <Reveal as="h2" className="signal-heading" delay={80}>
                {stage.title}
              </Reveal>
              <Reveal as="p" className="signal-body" delay={120}>
                {stage.body}
              </Reveal>

              {stage.stats ? (
                <Reveal as="div" className="signal-stats" delay={160}>
                  {stage.stats.map((stat) => (
                    <div key={stat.l} className="signal-stat">
                      <span className="signal-stat-n">{stat.n}</span>
                      <span className="signal-stat-l">{stat.l}</span>
                    </div>
                  ))}
                </Reveal>
              ) : null}

              {stage.features ? (
                <Reveal as="ul" className="signal-features" delay={160}>
                  {stage.features.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </Reveal>
              ) : null}
            </div>
          </div>
        ))}

        <div className="signal-rest">{children}</div>
      </div>
    </section>
  )
}
