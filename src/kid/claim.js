// Talks to the Cogteach backend: logins, k-ID claims (claimed server-side with
// the secret key), and the AI steps.

export class ApiError extends Error {
  constructor(message, status, body) {
    super(message)
    this.status = status
    this.body = body
  }
}

// `token` is the logged-in account's token (or null for login/register).
export async function api(token, method, path, body, { timeoutMs = 60000 } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(path, {
      method,
      signal: controller.signal,
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
        ...(body && { 'Content-Type': 'application/json' }),
      },
      body: body && JSON.stringify(body),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok) throw new ApiError(data?.error ?? `${method} ${path} failed with ${res.status}`, res.status, data)
    return data
  } catch (err) {
    if (err.name === 'AbortError') throw new ApiError('The server took too long. Try again.', 0)
    if (err instanceof ApiError) throw err
    throw new ApiError("Can't reach the Cogteach server. Is `npm run server` running?", 0)
  } finally {
    clearTimeout(timer)
  }
}

// One per k-ID session (one per account).
export function createKidBackend(token) {
  // The claim must land before the backend can act on onSession, so keep it.
  let lastClaim = Promise.resolve()

  return {
    // onClaim: the token expires after 10 minutes and works once, so send it now.
    sendClaimToken(claimToken) {
      lastClaim = api(token, 'POST', '/api/kid/claim', { claimToken }).catch((err) =>
        console.error('Failed to send k-ID claim token', err),
      )
      return lastClaim
    },

    // onSession: tell the backend so it can check a pending challenge. The
    // session id stays in the app; the backend only trusts what k-ID tells it.
    async notifySession() {
      await lastClaim
      try {
        await api(token, 'POST', '/api/kid/session-ready')
      } catch (err) {
        console.error('Failed to notify backend of k-ID session', err)
      }
    },

    // Resolves after the latest claim reached the server.
    settled: () => lastClaim,
  }
}
