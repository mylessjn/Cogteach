import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Hero } from '../../components/Layout.jsx'
import { createClass, listenTeacherClasses } from '../../lib/data.js'

export default function Classes({ teacherId }) {
  const [classes, setClasses] = useState(null)
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => listenTeacherClasses(teacherId, setClasses), [teacherId])

  async function onCreate(e) {
    e.preventDefault()
    if (!name.trim()) return
    setBusy(true)
    try {
      await createClass(teacherId, name.trim())
      setName('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <p className="crumbs">
        <span className="pill green">✓ Verified adult</span>
      </p>
      <Hero eyebrow="Teacher dashboard">Your classes</Hero>

      {classes === null ? (
        <p className="muted">Loading…</p>
      ) : classes.length === 0 ? (
        <p className="muted">No classes yet. Make your first one below.</p>
      ) : (
        <ul className="cards">
          {classes.map((c) => (
            <li key={c.id} className="card">
              <p className="label">Class</p>
              <h3>{c.name}</h3>
              <p className="muted small">
                Join code <code className="code">{c.joinCode}</code>
              </p>
              <div className="actions">
                <Link to={`class/${c.id}/create`} className="btn primary small">
                  Open class →
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form className="panel inline-form" onSubmit={onCreate}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Class name, e.g. Room 12 Science"
          aria-label="New class name"
        />
        <button className="btn primary" disabled={busy || !name.trim()}>
          New class
        </button>
      </form>
    </>
  )
}
