import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/Reveal.jsx'
import { about } from '../data/content.js'

export default function About() {
  return (
    <>
      <PageHero title="About" description={about.banner} />

      <section className="page-section">
        <Reveal as="h2" className="section-heading">
          {about.strengthTitle}
        </Reveal>
        <div className="panel-grid">
          <Reveal as="ul" className="feature-list">
            {about.strengths.slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </Reveal>
          <Reveal as="ul" className="feature-list" delay={80}>
            {about.strengths.slice(4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </Reveal>
        </div>
      </section>

      <section className="page-section mid">
        <div className="panel-grid">
          <Reveal as="div" className="panel">
            <h3>{about.coreBelief.title}</h3>
            <p className="section-copy">{about.coreBelief.text}</p>
          </Reveal>
          <Reveal as="div" className="panel" delay={80}>
            <h3>{about.mission.title}</h3>
            {about.mission.paragraphs.map((text) => (
              <p className="section-copy" key={text} style={{ marginBottom: '0.85rem' }}>
                {text}
              </p>
            ))}
          </Reveal>
        </div>
      </section>
    </>
  )
}
