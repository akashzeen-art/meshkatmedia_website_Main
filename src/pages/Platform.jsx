import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/Reveal.jsx'
import { platform } from '../data/content.js'

export default function Platform() {
  return (
    <>
      <PageHero title="Platform" description={platform.banner} />

      <section className="page-section">
        <Reveal as="p" className="section-copy" style={{ marginBottom: '2.5rem' }}>
          {platform.intro}
        </Reveal>
        <div className="tile-grid">
          {platform.items.map((item, index) => (
            <Reveal as="article" className="tile" delay={index * 60} key={item.title}>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </Reveal>
          ))}
        </div>
      </section>
    </>
  )
}
