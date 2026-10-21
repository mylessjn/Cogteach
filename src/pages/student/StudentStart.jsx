import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FirebaseMissing, Hero, Layout } from '../../components/Layout.jsx'
import { loadProfiles, removeProfile, saveProfile } from '../../kid/storage.js'
import { findClassByCode } from '../../lib/data.js'
import { firebaseConfigured } from '../../lib/firebase.js'
import { groupById, groupForAge } from '../../lib/groups.js'

// Pick a student on this device, or join a class as a new one.
export default function StudentStart() {
  const navigate = useNavigate()
  const [profiles, setProfiles] = useState(loadProfiles)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [age, setAge] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onJoin(e) {
    e.preventDefault()
    setError(null)
    const years = Number(age)
    if (!Number.isInteger(years) || years < 3 || years > 120) {
      return setError('Enter your age in years.')
    }
    setBusy(true)
    try {
      const cls = await findClassByCode(code)
      if (!cls) return setError("We couldn't find a class with that code.")
      const profile = {
        id: crypto.randomUUID(),
        displayName: name.trim(),
        classId: cls.id,
        className: cls.name,
        ageGroup: groupForAge(years), // the exact age is never stored
      }
      saveProfile(profile)
      // The age goes to k-ID once, in memory, as the age signal.
      navigate(`/student/${profile.id}`, { state: { age: years } })
    } finally {
      setBusy(false)
    }
  }

  function onRemove(id) {
    removeProfile(id)
    setProfiles(loadProfiles())
  }

  return (
    <Layout links={[{ to: '/student', label: 'Students' }]}>
      {!firebaseConfigured ? (
        <FirebaseMissing />
      ) : (
        <>
          <Hero eyebrow="Students">Who's learning today?</Hero>

          {profiles.length > 0 && (
            <ul className="cards">
              {profiles.map((p) => (
                <li key={p.id} className="card">
                  <p className="label">Ages {groupById(p.ageGroup)?.label}</p>
                  <h3>{p.displayName}</h3>
                  <p className="muted small">{p.className}</p>
                  <div className="actions">
                    <Link to={`/student/${p.id}`} className="btn small primary">
                      Open lessons →
                    </Link>
                    <button className="btn small" onClick={() => onRemove(p.id)}>
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          <form className="panel stack narrow" onSubmit={onJoin}>
            <h2>Join a class</h2>
            <label htmlFor="name">Your first name</label>
            <input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={30} />
            <label htmlFor="code">Class code</label>
            <input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              autoCapitalize="characters"
            />
            <label htmlFor="age">How old are you?</label>
            <input
              id="age"
              type="number"
              inputMode="numeric"
              min={3}
              max={120}
              value={age}
              onChange={(e) => setAge(e.target.value)}
            />
            {error && <p className="error">{error}</p>}
            <div className="actions">
              <button className="btn primary" disabled={busy || !name.trim() || code.length < 6 || !age}>
                Join →
              </button>
            </div>
          </form>
        </>
      )}
    </Layout>
  )
}
