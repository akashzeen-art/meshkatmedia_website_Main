import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/Reveal.jsx'
import { contentPage } from '../data/content.js'

export default function Content() {
  return (
    <>
      <PageHero title="Content" description={contentPage.banner} />

      <section className="page-section">
        <Reveal as="p" className="section-label">
          {contentPage.categoriesTitle}
        </Reveal>
        <div className="tile-grid three">
          {contentPage.categories.map((item, index) => (
            <Reveal as="article" className="tile" delay={index * 60} key={item.name}>
              <h3>{item.name}</h3>
              <p>{item.detail}</p>
            </Reveal>
          ))}
        </div>

        <Reveal as="div" className="panel" style={{ marginTop: '2.5rem' }}>
          <h3>{contentPage.updatesTitle}</h3>
          <p className="section-copy">{contentPage.updatesText}</p>
        </Reveal>
      </section>
    </>
  )
}
