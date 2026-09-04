import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/Reveal.jsx'
import { socialMedia } from '../data/content.js'

export default function SocialMediaMarketing() {
  return (
    <>
      <PageHero title="Social Media Marketing" description={socialMedia.banner} />

      <section className="page-section">
        <Reveal as="p" className="section-label">
          {socialMedia.platformsTitle}
        </Reveal>
        <div className="tile-grid three">
          {socialMedia.platforms.map((item, index) => (
            <Reveal as="article" className="tile" delay={index * 60} key={item.platform}>
              <h3>{item.platform}</h3>
              <p>{item.description}</p>
            </Reveal>
          ))}
        </div>

        <Reveal as="div" className="panel" style={{ marginTop: '2.5rem' }}>
          <h3>{socialMedia.approachTitle}</h3>
          <div className="panel-grid" style={{ marginTop: '1rem' }}>
            {socialMedia.approach.map((item) => (
              <div key={item.title}>
                <strong style={{ color: '#e8e0d5' }}>{item.title}</strong>
                <p className="section-copy" style={{ marginTop: '0.4rem' }}>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </section>
    </>
  )
}
