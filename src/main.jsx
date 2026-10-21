import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  KidAgeGate,
  KidAgeGateError,
  KidAgeGateFail,
  KidAgeGatePass,
  KidAgeGatePending,
  KidAgeGateProhibited,
  KidCoreProvider,
  KidSessionProvider,
} from '@k-id/core'
import './index.css'
import App from './App.jsx'
import { ClearOnMount } from './kid/ClearOnMount.jsx'
import { sendClaimToken } from './kid/claim.js'
import { KID_BASE_URL, KID_DECLARE, KID_PUBLISHABLE_KEY } from './kid/config.js'
import {
  CHALLENGE_ID_KEY,
  SESSION_ID_KEY,
  loadId,
  saveId,
} from './kid/storage.js'

// Read once per launch so the provider gets stable props.
const savedSessionId = loadId(SESSION_ID_KEY)
const savedChallengeId = loadId(CHALLENGE_ID_KEY)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <KidCoreProvider
      publishableKey={KID_PUBLISHABLE_KEY}
      baseUrl={KID_BASE_URL}
      declare={KID_DECLARE}
    >
      <KidSessionProvider
        jurisdiction="auto"
        sessionId={savedSessionId}
        challengeId={savedChallengeId}
        onSession={(id) => saveId(SESSION_ID_KEY, id)}
        onChallenge={(id) => saveId(CHALLENGE_ID_KEY, id)}
        onClaim={sendClaimToken}
      >
        <main className="gate">
          <KidAgeGate>
            <KidAgeGatePending>
              <h2>Waiting for a grown-up</h2>
              <p>
                We emailed your parent or guardian. Cogteach opens as soon as
                they approve. You can close this page and come back later.
              </p>
            </KidAgeGatePending>
            <KidAgeGateProhibited>
              <h2>Cogteach isn't available yet</h2>
              <p>You're under the minimum age for Cogteach where you live.</p>
            </KidAgeGateProhibited>
            <KidAgeGateFail>
              {/* Drop the dead challenge so the next launch can ask again. */}
              <ClearOnMount storageKey={CHALLENGE_ID_KEY} />
              <h2>Not approved</h2>
              <p>
                Your grown-up didn't approve, or the request expired. Reload
                to ask again.
              </p>
            </KidAgeGateFail>
            <KidAgeGateError>
              <h2>Something went wrong</h2>
              <p>We couldn't reach the age check. Reload to try again.</p>
            </KidAgeGateError>
            <KidAgeGatePass>
              <ClearOnMount storageKey={CHALLENGE_ID_KEY} />
              <App />
            </KidAgeGatePass>
          </KidAgeGate>
        </main>
      </KidSessionProvider>
    </KidCoreProvider>
  </StrictMode>,
)
