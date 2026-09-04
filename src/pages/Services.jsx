import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/Reveal.jsx'
import { services } from '../data/content.js'

export default function Services() {
  const location = useLocation()
  const [activeId, setActiveId] = useState(services.items[0].id)
  const active = services.items.find((item) => item.id === activeId) ?? services.items[0]

  useEffect(() => {
    const hash = location.hash.replace('#', '')
    if (hash && services.items.some((item) => item.id === hash)) {
      setActiveId(hash)
    }
  }, [location.hash])

  return (
    <>
      <PageHero title="Services" description={services.banner} />

      <section className="page-section">
        <div className="tabs">
          {services.items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`tab-btn${activeId === item.id ? ' active' : ''}`}
              onClick={() => setActiveId(item.id)}
            >
              {item.title}
            </button>
          ))}
        </div>

        <div className="service-detail" id={active.id}>
          <Reveal as="div" key={active.id}>
            <h2>{active.title}</h2>
            <p className="section-copy">{active.summary}</p>
          </Reveal>
          <Reveal as="div" delay={80} key={`${active.id}-benefits`}>
            <p className="section-label">Key benefits</p>
            <ul className="feature-list">
              {services.benefits.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  )
}
