import MagneticButton from '../components/MagneticButton.jsx'

export default function NotFound() {
  return (
    <div className="not-found">
      <div>
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
        <MagneticButton to="/">Back to Home</MagneticButton>
      </div>
    </div>
  )
}
