import { useMemo, useState } from 'react'
import {
  KidAgeGate,
  KidAgeGateError,
  KidAgeGateFail,
  KidAgeGatePass,
  KidAgeGatePending,
  KidAgeGateProhibited,
  KidSessionProvider,
} from '@k-id/core'
import { ClearOnMount } from './ClearOnMount.jsx'
import { kidKeys, loadId, saveId } from './storage.js'

// One k-ID age gate + session per account. k-ID asks the country (auto) and
// age itself, with whatever input the jurisdiction approves. `backend` (from
// createKidBackend) sends the claim to our server.
export function KidGate({ accountId, backend, pending, children }) {
  const keys = useMemo(() => kidKeys(`acct.${accountId}`), [accountId])
  // Read once per mount so the provider gets stable props.
  const [saved] = useState(() => ({
    sessionId: loadId(keys.sessionId),
    challengeId: loadId(keys.challengeId),
  }))

  return (
    <KidSessionProvider
      jurisdiction="auto"
      sessionId={saved.sessionId}
      challengeId={saved.challengeId}
      onSession={(id) => {
        saveId(keys.sessionId, id)
        backend.notifySession()
      }}
      onChallenge={(id) => saveId(keys.challengeId, id)}
      onClaim={backend.sendClaimToken}
    >
      <KidAgeGate>
        <KidAgeGatePending>
          {pending ?? (
            <div className="notice">
              <h2>Waiting for a grown-up</h2>
              <p>
                We emailed your parent or guardian. Cogteach opens as soon as they approve.
                You can close this page and come back later.
              </p>
            </div>
          )}
        </KidAgeGatePending>
        <KidAgeGateProhibited>
          <div className="notice">
            <h2>Cogteach isn't available yet</h2>
            <p>You're under the minimum age for Cogteach where you live.</p>
          </div>
        </KidAgeGateProhibited>
        <KidAgeGateFail>
          {/* Drop the dead challenge so the next visit can ask again. */}
          <ClearOnMount storageKey={keys.challengeId} />
          <div className="notice">
            <h2>Not approved</h2>
            <p>Your grown-up didn't approve, or the request expired. Reload to ask again.</p>
          </div>
        </KidAgeGateFail>
        <KidAgeGateError>
          <div className="notice">
            <h2>Something went wrong</h2>
            <p>We couldn't reach the age check. Reload to try again.</p>
          </div>
        </KidAgeGateError>
        <KidAgeGatePass>
          <ClearOnMount storageKey={keys.challengeId} />
          {children}
        </KidAgeGatePass>
      </KidAgeGate>
    </KidSessionProvider>
  )
}
