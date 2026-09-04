import { useState } from 'react'
import MagneticButton from '../components/MagneticButton.jsx'
import PageHero from '../components/PageHero.jsx'
import Reveal from '../components/Reveal.jsx'
import { brand, contact } from '../data/content.js'

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' })
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
    setForm({ name: '', email: '', phone: '', message: '' })
  }

  return (
    <>
      <PageHero title="Contact" />

      <section className="page-section">
        <div className="contact-grid">
          <Reveal as="div">
            <h2 className="section-heading">{contact.getInTouch}</h2>
            <div className="contact-line">
              <span>Company</span>
              <p>{brand.legalName}</p>
            </div>
            <div className="contact-line">
              <span>Address</span>
              <p>{brand.address}</p>
            </div>
            <div className="contact-line">
              <span>Phone</span>
              <a href={brand.phoneHref}>{brand.phone}</a>
            </div>
            <div className="contact-line">
              <span>Email</span>
              <a href={brand.emailHref}>{brand.email}</a>
            </div>
            <p style={{ marginTop: '1.75rem', color: '#7a6f65' }}>{contact.enquiry}</p>
          </Reveal>

          <Reveal as="form" className="contact-form" delay={80} onSubmit={handleSubmit}>
            {submitted ? <div className="form-success">{contact.success}</div> : null}

            <div className="form-field">
              <label htmlFor="name">{contact.formLabels.name}</label>
              <input id="name" name="name" value={form.name} onChange={handleChange} required />
            </div>

            <div className="form-field">
              <label htmlFor="email">{contact.formLabels.email}</label>
              <input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-field">
              <label htmlFor="phone">{contact.formLabels.phone}</label>
              <input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
              />
            </div>

            <div className="form-field">
              <label htmlFor="message">{contact.formLabels.message}</label>
              <textarea
                id="message"
                name="message"
                rows="5"
                value={form.message}
                onChange={handleChange}
                required
              />
            </div>

            <MagneticButton type="submit">{contact.formLabels.submit}</MagneticButton>
          </Reveal>
        </div>
      </section>
    </>
  )
}
