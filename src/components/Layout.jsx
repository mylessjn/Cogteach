import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/context.js'

// Khan Academy-style page: navy header with brand left and links right, gray
// page, one-line footer. `theme` swaps the page look (e.g. "sunny", "dark").
export function Layout({ links = [], children, bare = false, theme }) {
  const { account, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className={`page ${theme ? `theme-${theme}` : ''}`}>
      <header className="topbar">
        <div className="topbar-inner">
          <Link to="/" className="brand">
            <img src="/icon.png" alt="" />
            Cogteach
          </Link>
          <nav className="navlinks">
            {links.map(({ to, label, end }) => (
              <NavLink key={to} to={to} end={end} className="navlink">
                {label}
              </NavLink>
            ))}
            {account && (
              <>
                <span className="who">{account.displayName}</span>
                <button
                  className="navlink as-button"
                  onClick={async () => {
                    await signOut()
                    navigate(`/login/${account.role}`)
                  }}
                >
                  Log out
                </button>
              </>
            )}
          </nav>
        </div>
      </header>
      {bare ? children : <main className="content">{children}</main>}
      <footer className="footer">
        <div className="footer-inner">
          Cogteach · Build for Everyone · Education track ·{' '}
          <a href="/privacy.html">Privacy</a> · <a href="/terms.html">Terms</a>
        </div>
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

// "Classes · Room 12 Science" style trail. Items: { to?, label }.
export function Crumbs({ items }) {
  return (
    <nav className="crumbs" aria-label="Breadcrumb">
      {items.map((item, i) => (
        <span key={i}>
          {i > 0 && <span aria-hidden="true">· </span>}
          {item.to ? <Link to={item.to}>{item.label}</Link> : item.label}
        </span>
      ))}
    </nav>
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
