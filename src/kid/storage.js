// Persists ids between visits so an in-flight k-ID flow can resume. Each k-ID
// session (the teacher, each student profile) has its own scope, so several
// can live in one browser for the demo.
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

export function loadJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
}

export function saveJson(key, value) {
  saveId(key, JSON.stringify(value))
}

// The teacher's id in this browser.
export function teacherId() {
  let id = loadId('cogteach.teacherId')
  if (!id) {
    id = crypto.randomUUID()
    saveId('cogteach.teacherId', id)
  }
  return id
}

// Student profiles in this browser: { id, displayName, classId, className, ageGroup }.
const PROFILES_KEY = 'cogteach.students'
export const loadProfiles = () => loadJson(PROFILES_KEY, [])
export function saveProfile(profile) {
  saveJson(PROFILES_KEY, [...loadProfiles().filter((p) => p.id !== profile.id), profile])
}
export function removeProfile(id) {
  saveJson(PROFILES_KEY, loadProfiles().filter((p) => p.id !== id))
  const keys = kidKeys(`student.${id}`)
  Object.values(keys).forEach(clearId)
}
