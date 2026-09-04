import MagneticButton from '../components/MagneticButton.jsx'
import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/Reveal.jsx'
import { partners } from '../data/content.js'

export default function Partners() {
  return (
    <>
      <PageHero title="Partners" description={partners.banner} />

      <section className="page-section">
        <div className="panel-grid">
          <Reveal as="div" className="panel">
            <h3>{partners.whyTitle}</h3>
            <ul className="feature-list" style={{ marginTop: '1rem' }}>
              {partners.why.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Reveal>

          <Reveal as="div" className="panel" delay={80}>
            <h3>{partners.typesTitle}</h3>
            <div style={{ marginTop: '1rem', display: 'grid', gap: '1rem' }}>
              {partners.types.map((item) => (
                <div key={item.title}>
                  <strong style={{ color: '#e8e0d5' }}>{item.title}</strong>
                  <p className="section-copy" style={{ marginTop: '0.35rem' }}>
                    {item.text}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>

        <Reveal as="div" className="cta-band" style={{ marginTop: '2.5rem' }}>
          <div>
            <h2>{partners.ctaTitle}</h2>
            <p>{partners.ctaText}</p>
          </div>
          <MagneticButton to="/contact">{partners.ctaButton}</MagneticButton>
        </Reveal>
      </section>
    </>
  )
}
