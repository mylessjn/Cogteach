import { useState } from 'react'
import {
  KidSessionVerifyAge,
  KidSessionVerifyAgeError,
  KidSessionVerifyAgeFail,
  KidSessionVerifyAgePass,
  KidSessionVerifyAgePending,
  useKidSession,
} from '@k-id/core'
import { Route, Routes } from 'react-router-dom'
import { FirebaseMissing, Hero, Layout } from '../../components/Layout.jsx'
import { KidGate } from '../../kid/KidGate.jsx'
import { teacherId as loadTeacherId } from '../../kid/storage.js'
import { firebaseConfigured } from '../../lib/firebase.js'
import ClassPage from './ClassPage.jsx'
import Classes from './Classes.jsx'

// Teacher -> age gate -> verified adult -> Classes.
export default function Teacher() {
  const [teacherId] = useState(loadTeacherId)

  return (
    <Layout links={[{ to: '/teacher', label: 'Classes' }]}>
      {!firebaseConfigured ? (
        <FirebaseMissing />
      ) : (
        <KidGate scope="teacher" playerId={teacherId}>
          <VerifyIntro />
          <KidSessionVerifyAge>
            <KidSessionVerifyAgePass>
              <Routes>
                <Route index element={<Classes teacherId={teacherId} />} />
                <Route path="class/:classId/:tab?" element={<ClassPage teacherId={teacherId} />} />
              </Routes>
            </KidSessionVerifyAgePass>
            <KidSessionVerifyAgePending>
              <div className="notice">
                <h2>Check your email</h2>
                <p>
                  We sent you a link to verify you're an adult. Open it, then come back here.
                  This page updates on its own.
                </p>
              </div>
            </KidSessionVerifyAgePending>
            <KidSessionVerifyAgeFail>
              <div className="notice">
                <h2>We couldn't verify you're an adult</h2>
                <p>Only a verified adult can approve lessons for children.</p>
              </div>
            </KidSessionVerifyAgeFail>
            <KidSessionVerifyAgeError>
              <div className="notice">
                <h2>Something went wrong</h2>
                <p>We couldn't reach k-ID. Reload to try again.</p>
              </div>
            </KidSessionVerifyAgeError>
          </KidSessionVerifyAge>
        </KidGate>
      )}
    </Layout>
  )
}

// Shown above k-ID's email form, only while it's asking for the email.
function VerifyIntro() {
  const { verifyAge } = useKidSession()
  if (verifyAge.status !== 'running' || verifyAge.step !== 'email') return null
  return (
    <>
      <Hero eyebrow="Teacher">Verify you're an adult</Hero>
      <p className="lede">
        Only a verified adult can approve AI lessons that go to children. k-ID emails you a link
        to confirm. You only do this once.
      </p>
    </>
  )
}
