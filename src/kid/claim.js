// Talks to the Cogteach backend, which claims k-ID results with the secret key
// and runs the teacher-only AI steps.
//
// STUB: Cogteach has no login yet. The teacher and each student profile get a
// random id kept in the browser, sent as X-Player-Id. Replace with real
// accounts later.

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

export async function api(playerId, method, path, body) {
  const res = await fetch(path, {
    method,
    headers: {
      'X-Player-Id': playerId,
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(data?.error ?? `${method} ${path} failed with ${res.status}`, res.status, data)
  return data
}

// One per k-ID session (teacher, or a student profile).
export function createKidBackend(playerId) {
  // The claim must land before the backend can act on onSession, so keep it.
  let lastClaim = Promise.resolve()

  return {
    // onClaim: the token expires after 10 minutes and works once, so send it now.
    sendClaimToken(claimToken) {
      lastClaim = api(playerId, 'POST', '/api/kid/claim', { claimToken }).catch((err) =>
        console.error('Failed to send k-ID claim token', err),
      )
      return lastClaim
    },

    // onSession: tell the backend so it can check a pending challenge. The
    // session id stays in the app; the backend only trusts what k-ID tells it.
    async notifySession() {
      await lastClaim
      try {
        await api(playerId, 'POST', '/api/kid/session-ready')
      } catch (err) {
        console.error('Failed to notify backend of k-ID session', err)
      }
    },
  }
}
