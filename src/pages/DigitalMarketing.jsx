import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/Reveal.jsx'
import { digitalMarketing } from '../data/content.js'

export default function DigitalMarketing() {
  return (
    <>
      <PageHero title="Digital Marketing" description={digitalMarketing.banner} />

      <section className="page-section">
        <Reveal as="p" className="section-label">
          {digitalMarketing.solutionsTitle}
        </Reveal>
        <div className="tile-grid three">
          {digitalMarketing.solutions.map((item, index) => (
            <Reveal as="article" className="tile" delay={index * 60} key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </Reveal>
          ))}
        </div>

        <Reveal as="div" className="panel" style={{ marginTop: '2.5rem' }}>
          <h3>{digitalMarketing.whyTitle}</h3>
          <ul className="feature-list" style={{ marginTop: '1rem' }}>
            {digitalMarketing.why.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Reveal>
      </section>
    </>
  )
}
