import { useEffect, useMemo, useState } from 'react'
import { KidSettings, KidSettingsProvider, useKidPermission, useKidSession } from '@k-id/core'
import { Route, Routes } from 'react-router-dom'
import { useAuth } from '../../auth/context.js'
import { FirebaseMissing, Hero, Layout } from '../../components/Layout.jsx'
import { api, createKidBackend } from '../../kid/claim.js'
import { CountryRules } from '../../kid/CountryRules.jsx'
import { KidGate } from '../../kid/KidGate.jsx'
import { kidKeys, loadId, saveId } from '../../kid/storage.js'
import { findClassByCode, getClass, saveStudent } from '../../lib/data.js'
import { firebaseConfigured } from '../../lib/firebase.js'
import { groupById } from '../../lib/groups.js'
import StudentHome from './Homes.jsx'
import Lesson from './Lesson.jsx'

const THEME = { preoperational: 'sunny', concrete: 'play', formal: 'dark', adult: 'clean' }

// Student login -> k-ID's own age check -> age group -> join a class ->
// (parent approval if k-ID requires it) -> home for their stage.
export default function Student() {
  const { account, token } = useAuth()
  const backend = useMemo(() => createKidBackend(token), [token])

  return (
    <Layout
      theme={THEME[account.ageGroup]}
      links={[
        { to: '/student', label: 'Home', end: true },
        { to: '/student/settings', label: 'Settings' },
      ]}
    >
      {!firebaseConfigured ? (
        <FirebaseMissing />
      ) : (
        <KidGate key={account.id} accountId={account.id} backend={backend}>
          <AgeGroup backend={backend}>
            <Routes>
              <Route path="settings" element={<Settings />} />
              <Route
                path="*"
                element={
                  <JoinClass>
                    <Membership>
                      <Routes>
                        <Route index element={<StudentHome />} />
                        <Route path="lesson/:lessonId" element={<Lesson />} />
                      </Routes>
                    </Membership>
                  </JoinClass>
                }
              />
            </Routes>
          </AgeGroup>
        </KidGate>
      )}
    </Layout>
  )
}

// After k-ID's age check passes, the server reads the age and country k-ID
// recorded and stores only the group and the country code. Accounts made
// before the country was saved pick it up once, in the background.
function AgeGroup({ backend, children }) {
  const { account, token, setAccount } = useAuth()
  const [error, setError] = useState(null)
  const missing = !account.ageGroup
  const [refresh] = useState(() => !account.ageGroup || !account.country)

  useEffect(() => {
    if (!refresh) return
    let cancelled = false
    // The claim can still be landing when the gate passes; the server answers
    // 409 until it has, so wait and try again a few times.
    async function load() {
      for (let attempt = 0; ; attempt++) {
        await backend.settled()
        try {
          return await api(token, 'POST', '/api/me/age-group')
        } catch (err) {
          if (err.status !== 409 || attempt >= 5) throw err
          await new Promise((r) => setTimeout(r, 800))
        }
      }
    }
    load()
      .then(({ account }) => !cancelled && setAccount(account))
      .catch((err) => !cancelled && setError(err.message))
    return () => {
      cancelled = true
    }
  }, [refresh, backend, token, setAccount])

  if (error && missing) {
    return (
      <div className="notice">
        <h2>We couldn't finish the age check</h2>
        <p>{error}</p>
        <button className="btn" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    )
  }
  if (missing) return <p className="muted">Setting things up for you…</p>
  return children
}

// Join with a class code. The button always works: a bad code shows a clear
// message, and a slow lookup gives up after 8 seconds.
function JoinClass({ children }) {
  const { account, token, setAccount } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (account.classId) return children

  async function onJoin(e) {
    e.preventDefault()
    setError(null)
    const clean = code.trim().toUpperCase()
    if (!/^[A-Z0-9]{6}$/.test(clean)) return setError('Class codes are 6 letters and numbers.')
    setBusy(true)
    try {
      const cls = await findClassByCode(clean)
      if (!cls) return setError(`No class has the code ${clean}. Check it with your teacher.`)
      const { account: updated } = await api(token, 'POST', '/api/me/class', { classId: cls.id })
      setAccount(updated)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Hero eyebrow={`Ages ${groupById(account.ageGroup).label}`}>Join your class</Hero>
      <form className="panel stack narrow" onSubmit={onJoin}>
        <label htmlFor="code">Class code</label>
        <input
          id="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
        />
        {error && <p className="error">{error}</p>}
        <div className="actions">
          <button className="btn primary" disabled={busy}>
            {busy ? 'Looking…' : 'Join'}
          </button>
        </div>
      </form>
    </>
  )
}

// Joining a class needs k-ID's join-groups permission. Checked every render;
// the teacher's roster shows Active or Waiting for parent.
function Membership({ children }) {
  const { account } = useAuth()
  const { sessionId, isLoaded, refresh } = useKidSession()
  const permission = useKidPermission().get('join-groups')
  const declared = Boolean(permission)
  const enabled = Boolean(permission?.enabled)
  const prohibited = permission?.managedBy === 'PROHIBITED'
  const status = enabled ? 'Active' : 'Waiting for parent'
  const [className, setClassName] = useState('')

  useEffect(() => {
    getClass(account.classId).then((c) => setClassName(c?.name ?? ''))
  }, [account.classId])

  useEffect(() => {
    if (!isLoaded || !declared || prohibited) return
    saveStudent(account.classId, account.id, {
      displayName: account.displayName,
      ageGroup: account.ageGroup,
      country: account.country ?? null,
      kidSessionId: sessionId ?? null,
      status,
    }).catch((err) => console.error('Failed to save student', err))
  }, [account, status, sessionId, isLoaded, declared, prohibited])

  // A parent can approve by email at any time; re-read the session until then.
  useEffect(() => {
    if (!isLoaded || enabled || prohibited) return
    const timer = setInterval(refresh, 10000)
    return () => clearInterval(timer)
  }, [isLoaded, enabled, prohibited, refresh])

  if (!isLoaded) return <p className="muted">Loading…</p>
  if (!declared || prohibited) {
    return (
      <div className="notice">
        <h2>Classes aren't available</h2>
        <p>Joining a class isn't available for your account.</p>
      </div>
    )
  }
  if (!enabled) {
    return (
      <>
        <Hero eyebrow={className}>Ask a parent</Hero>
        <p className="lede">
          {permission.managedBy === 'GUARDIAN'
            ? 'Where you live, a parent or guardian needs to say yes before you can join a class.'
            : 'Turn on joining groups to see your class.'}
        </p>
        <CountryRules compact />
        <SettingsPanel />
      </>
    )
  }
  return children
}

function Settings() {
  const { account } = useAuth()
  return (
    <>
      <Hero eyebrow={account.displayName}>Settings</Hero>
      <CountryRules compact />
      <SettingsPanel />
    </>
  )
}

// k-ID's permission menu: player-managed ones toggle, guardian-managed ones
// ask a grownup, prohibited ones are hidden.
function SettingsPanel() {
  const { account } = useAuth()
  const { sessionId } = useKidSession()
  const keys = kidKeys(`acct.${account.id}`)
  const [challengeId] = useState(() => loadId(keys.settingsChallengeId))
  if (!sessionId) return null
  return (
    <div className="kid-panel">
      <KidSettingsProvider
        sessionId={sessionId}
        challengeId={challengeId}
        onChallenge={(id) => saveId(keys.settingsChallengeId, id)}
      >
        <KidSettings />
      </KidSettingsProvider>
    </div>
  )
}
