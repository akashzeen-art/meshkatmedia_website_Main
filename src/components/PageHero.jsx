import Reveal from './Reveal.jsx'

export default function PageHero({ title, description }) {
  const paragraphs = Array.isArray(description)
    ? description
    : description
      ? [description]
      : []

  return (
    <section className="page-hero" aria-label={title}>
      <Reveal as="p" className="section-label">
        Meshkatmedia
      </Reveal>
      <Reveal as="h1" className="page-hero-title" delay={80}>
        {title}
      </Reveal>
      {paragraphs.map((text, index) => (
        <Reveal as="p" className="page-hero-copy" delay={160 + index * 80} key={text}>
          {text}
        </Reveal>
      ))}
    </section>
  )
}
