import { useEffect, useState } from 'react'
import { KidSettings, KidSettingsProvider, useKidPermission, useKidSession } from '@k-id/core'
import { Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { Hero, Layout } from '../../components/Layout.jsx'
import { KidGate } from '../../kid/KidGate.jsx'
import { kidKeys, loadId, loadProfiles, saveId } from '../../kid/storage.js'
import { saveStudent } from '../../lib/data.js'
import Lesson from './Lesson.jsx'
import MyLessons from './MyLessons.jsx'

// One student profile: age gate -> class membership -> lessons.
export default function StudentProfile() {
  const { profileId } = useParams()
  const location = useLocation()
  const profile = loadProfiles().find((p) => p.id === profileId)
  if (!profile) return <Navigate to="/student" replace />

  const base = `/student/${profile.id}`
  return (
    <Layout
      links={[
        { to: base, label: 'My lessons', end: true },
        { to: `${base}/settings`, label: 'Settings' },
        { to: '/student', label: 'Switch student', end: true },
      ]}
    >
      <KidGate
        key={profile.id}
        scope={`student.${profile.id}`}
        playerId={profile.id}
        age={location.state?.age}
        pending={<WaitingForParent profile={profile} />}
      >
        <Routes>
          <Route path="settings" element={<Settings profile={profile} />} />
          <Route
            path="*"
            element={
              <Membership profile={profile}>
                <Routes>
                  <Route index element={<MyLessons profile={profile} />} />
                  <Route path="lesson/:lessonId" element={<Lesson profile={profile} />} />
                </Routes>
              </Membership>
            }
          />
        </Routes>
      </KidGate>
    </Layout>
  )
}

const record = (profile, status, kidSessionId) =>
  saveStudent(profile.classId, profile.id, {
    displayName: profile.displayName,
    ageGroup: profile.ageGroup,
    kidSessionId: kidSessionId ?? null,
    status,
  }).catch((err) => console.error('Failed to save student', err))

// k-ID is waiting on a parent: show it, and tell the teacher.
function WaitingForParent({ profile }) {
  useEffect(() => {
    record(profile, 'Waiting for parent')
  }, [profile])
  return (
    <div className="notice">
      <h2>Waiting for a grown-up</h2>
      <p>
        We emailed your parent or guardian to say yes to joining {profile.className}. Come back
        after they approve.
      </p>
    </div>
  )
}

// Joining a class needs k-ID's join-groups permission. Checked every render.
function Membership({ profile, children }) {
  const { sessionId, isLoaded, refresh } = useKidSession()
  const permission = useKidPermission().get('join-groups')
  const declared = Boolean(permission)
  const enabled = Boolean(permission?.enabled)
  const prohibited = permission?.managedBy === 'PROHIBITED'
  const status = enabled ? 'Active' : 'Waiting for parent'

  useEffect(() => {
    if (isLoaded && declared && !prohibited) record(profile, status, sessionId)
  }, [profile, status, sessionId, isLoaded, declared, prohibited])

  // A parent can approve by email at any time; re-read the session until then.
  useEffect(() => {
    if (!isLoaded || enabled || prohibited) return
    const timer = setInterval(refresh, 10000)
    return () => clearInterval(timer)
  }, [isLoaded, enabled, prohibited, refresh])

  if (!isLoaded) return <p className="muted">Loading…</p>
  if (!permission || prohibited) {
    return (
      <div className="notice">
        <h2>Classes aren't available</h2>
        <p>Joining a class isn't available for your account.</p>
      </div>
    )
  }
  if (!permission.enabled) {
    return (
      <>
        <Hero eyebrow={profile.className}>Ask a parent</Hero>
        <p className="lede">
          {permission.managedBy === 'GUARDIAN'
            ? 'A parent or guardian needs to say yes before you can join this class.'
            : 'Turn on joining groups to see your class.'}
        </p>
        <SettingsPanel profile={profile} />
      </>
    )
  }
  return children
}

function Settings({ profile }) {
  return (
    <>
      <Hero eyebrow={profile.displayName}>Settings</Hero>
      <SettingsPanel profile={profile} />
    </>
  )
}

// k-ID's permission menu: player-managed ones toggle, guardian-managed ones
// ask a grownup, prohibited ones are hidden.
function SettingsPanel({ profile }) {
  const { sessionId } = useKidSession()
  const keys = kidKeys(`student.${profile.id}`)
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
