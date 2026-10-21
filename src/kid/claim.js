// Talks to the Cogteach backend, which claims k-ID results with the secret key.
import { loadId, saveId } from './storage.js'

const PLAYER_ID_KEY = 'cogteach.playerId'

// STUB: Cogteach has no login yet, so each browser gets an anonymous player id.
// Replace with the signed-in user's credentials once accounts exist.
function playerId() {
  let id = loadId(PLAYER_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    saveId(PLAYER_ID_KEY, id)
  }
  return id
}

async function api(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: {
      'X-Player-Id': playerId(),
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${path} failed with ${res.status}`)
  return res.json()
}

// The claim must land before the backend can act on onSession, so keep it.
let lastClaim = Promise.resolve()

// onClaim: the token expires after 10 minutes and works once, so send it now.
export function sendClaimToken(claimToken) {
  lastClaim = api('POST', '/api/kid/claim', { claimToken }).catch((err) =>
    console.error('Failed to send k-ID claim token', err),
  )
  return lastClaim
}

// onSession: tell the backend so it can check a pending challenge. The
// session id stays in the app; the backend only trusts what k-ID tells it.
export async function notifySession() {
  await lastClaim
  try {
    await api('POST', '/api/kid/session-ready')
  } catch (err) {
    console.error('Failed to notify backend of k-ID session', err)
  }
}
