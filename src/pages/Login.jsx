import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/context.js'
import { Hero, Layout } from '../components/Layout.jsx'

const COPY = {
  teacher: { title: 'Teacher login', blurb: "You'll verify you're an adult with k-ID once." },
  student: { title: 'Student login', blurb: 'A grown-up can help you make an account.' },
}

// Username + password, one page per role, with a "make an account" toggle.
export default function Login() {
  const { role } = useParams()
  const { account, signIn } = useAuth()
  const [mode, setMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (!COPY[role]) return <Navigate to="/" replace />
  if (account?.role === role) return <Navigate to={`/${role}`} replace />

  async function onSubmit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await signIn(mode, { username, password, role, displayName })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const other = role === 'teacher' ? 'student' : 'teacher'
  return (
    <Layout>
      <Hero eyebrow={role === 'teacher' ? 'Teachers' : 'Students'}>{COPY[role].title}</Hero>
      {account && (
        <p className="muted">
          You're logged in as {account.displayName} ({account.role}). Logging in here switches
          accounts.
        </p>
      )}
      <form className="panel stack narrow" onSubmit={onSubmit}>
        <div className="seg">
          <button type="button" className={mode === 'login' ? 'on' : ''} onClick={() => setMode('login')}>
            Log in
          </button>
          <button type="button" className={mode === 'register' ? 'on' : ''} onClick={() => setMode('register')}>
            Make an account
          </button>
        </div>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        {mode === 'register' && (
          <>
            <label htmlFor="displayName">{role === 'teacher' ? 'Your name' : 'First name'}</label>
            <input
              id="displayName"
              value={displayName}
              maxLength={30}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </>
        )}
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button className="btn primary" disabled={busy || !username || !password}>
            {mode === 'login' ? 'Log in' : 'Make account'}
          </button>
        </div>
        <p className="muted small">{COPY[role].blurb}</p>
      </form>
      <p className="small">
        <Link to={`/login/${other}`}>I'm a {other} →</Link>
      </p>
    </Layout>
  )
}
