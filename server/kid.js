// Server-side k-ID client. Uses the SECRET key, so this file must only ever
// run on the server.
const KID_API = 'https://kai-api.test.k-id.com/api/v1'

function secretKey() {
  const key = process.env.KID_SECRET_KEY
  if (!key) {
    throw new Error(
      'KID_SECRET_KEY is not set. Copy the secret key from Kai into the server environment.',
    )
  }
  return key
}

export class KidApiError extends Error {
  constructor(path, status, body) {
    super(`k-ID ${path} failed with ${status}`)
    this.status = status
    this.body = body
  }
}

async function call(method, path, body) {
  const res = await fetch(`${KID_API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...(body && { 'Content-Type': 'application/json' }),
    },
    body: body && JSON.stringify(body),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : null
  if (!res.ok) throw new KidApiError(path, res.status, data)
  return data
}

// -> { type: 'session' | 'challenge', status, sessionId? , challengeId? }
export function claim(claimToken) {
  return call('POST', '/client/claim', { claimToken })
}

// -> { status, sessionId? }
export function getChallengeStatus(challengeId) {
  return call(
    'GET',
    `/challenge/get-status?challengeId=${encodeURIComponent(challengeId)}`,
  )
}

// -> the session, including the player's age and permissions.
export function getSession(sessionId) {
  return call('GET', `/session/get?sessionId=${encodeURIComponent(sessionId)}`)
}

export function deleteSession(sessionId) {
  return call('POST', '/session/delete', { sessionId })
}

export function checkSecretKey() {
  const key = secretKey()
  if (!key.startsWith('kgs_test_')) {
    console.warn(
      'KID_SECRET_KEY does not start with kgs_test_, but the API is the test host.',
    )
  }
}
