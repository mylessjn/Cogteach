// Persists k-ID ids between visits so an in-flight flow can resume. Each
// account has its own scope, so several can live in one browser for the demo.
export const kidKeys = (scope) => ({
  sessionId: `kid.${scope}.sessionId`,
  challengeId: `kid.${scope}.challengeId`,
  settingsChallengeId: `kid.${scope}.settingsChallengeId`,
})

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
