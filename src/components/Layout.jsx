import { Link, NavLink } from 'react-router-dom'

// Lev-style page: brand left, a few text links right, one-line footer.
export function Layout({ links = [], badge, children }) {
  return (
    <div className="page">
      <header className="topbar">
        <Link to="/" className="brand">
          Cog<span className="accent">teach</span>
        </Link>
        <nav className="navlinks">
          {badge}
          {links.map(({ to, label, end }) => (
            <NavLink key={to} to={to} end={end} className="navlink">
              {label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="content">{children}</main>
      <footer className="footer">
        Cogteach · Build for Everyone · Education track ·{' '}
        <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a>
      </footer>
    </div>
  )
}

export function Hero({ eyebrow, children }) {
  return (
    <div className="hero">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1>{children}</h1>
    </div>
  )
}

export function FirebaseMissing() {
  return (
    <div className="notice">
      <h2>Firestore isn't set up yet</h2>
      <p>
        Add <code>VITE_FIREBASE_API_KEY</code>, <code>VITE_FIREBASE_AUTH_DOMAIN</code>,{' '}
        <code>VITE_FIREBASE_PROJECT_ID</code> and <code>VITE_FIREBASE_APP_ID</code> to{' '}
        <code>.env.local</code>, then restart <code>npm run dev</code>.
      </p>
    </div>
  )
}
