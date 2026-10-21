// Persists k-ID ids between launches so an in-flight flow can resume.
export const SESSION_ID_KEY = 'kid.sessionId'
export const CHALLENGE_ID_KEY = 'kid.challengeId'
export const SETTINGS_CHALLENGE_ID_KEY = 'kid.settingsChallengeId'

export function loadId(key) {
  try {
    return localStorage.getItem(key) ?? undefined
  } catch {
    return undefined
  }
}

export function saveId(key, value) {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Storage unavailable (private mode); the flow just won't resume.
  }
}

export function clearId(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // ignore
  }
}
