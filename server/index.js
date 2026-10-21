// Cogteach backend: logins, k-ID claims (with the secret key), and the
// Inworld steps (Build, Curate, Picture, Speak for verified-adult teachers;
// Listen for students with ai-voice-mode on).
// Run with `npm run server`. KID_SECRET_KEY (.env) and INWORLD_API_KEY
// (.env.local) must be set; both files are git-ignored.
import { createServer } from 'node:http'
import * as auth from './auth.js'
import * as inworld from './inworld.js'
import * as kid from './kid.js'
import { deleteAccount, updateAccount } from './store.js'
import { groupForAge } from '../src/lib/groups.js'

const PORT = Number(process.env.PORT) || 8787
const MAX_BODY = 5 * 1024 * 1024

// An account is unlocked only once a claim (or a later challenge check) has
// given us a k-ID session for it. Gate any server-side feature on this.
const isUnlocked = (account) => Boolean(account?.kidSessionId)

async function readJson(req) {
  let body = ''
  for await (const chunk of req) {
    body += chunk
    if (body.length > MAX_BODY) throw new auth.AuthError('Request too large.', 413)
  }
  return body ? JSON.parse(body) : {}
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// k-ID sessions, read from k-ID (never from the app), cached briefly.
const sessionCache = new Map()
async function kidSession(account, maxAgeMs = 60 * 1000) {
  const hit = sessionCache.get(account.kidSessionId)
  if (hit && hit.at > Date.now() - maxAgeMs) return hit.session
  const session = await kid.getSession(account.kidSessionId)
  sessionCache.set(account.kidSessionId, { session, at: Date.now() })
  return session
}

// ---- logins ----
async function handleRegister(req, res) {
  send(res, 200, await auth.register(await readJson(req)))
}

async function handleLogin(req, res) {
  send(res, 200, await auth.login(await readJson(req)))
}

async function handleLogout(req, res) {
  const token = auth.tokenFromRequest(req)
  if (token) await auth.logout(token)
  send(res, 200, { ok: true })
}

const handleMe = (req, res, account) => send(res, 200, { account: auth.publicAccount(account) })

// ---- k-ID ----
// POST /api/kid/claim { claimToken }
// The only thing we accept from the app is the one-time claim token. The
// session or challenge id always comes from k-ID's answer, never the app.
async function handleClaim(req, res, account) {
  const { claimToken } = await readJson(req)
  if (typeof claimToken !== 'string' || !claimToken) {
    return send(res, 400, { error: 'claimToken is required' })
  }
  const result = await kid.claim(claimToken)
  const changes = { kidClaimStatus: result.status }
  if (result.type === 'session') changes.kidSessionId = result.sessionId
  else if (result.type === 'challenge') changes.kidChallengeId = result.challengeId
  const updated = await updateAccount(account.id, changes)
  send(res, 200, { type: result.type, status: result.status, unlocked: isUnlocked(updated) })
}

// POST /api/kid/session-ready
// The app tells us onSession fired. If we're still waiting on a challenge,
// check it once with the challenge id we saved from the claim.
async function handleSessionReady(req, res, account) {
  if (isUnlocked(account)) return send(res, 200, { unlocked: true })
  // onSession can fire alongside onClaim, before the claim lands.
  if (!account.kidChallengeId) return send(res, 202, { unlocked: false })
  const result = await kid.getChallengeStatus(account.kidChallengeId)
  if (result.status === 'PASS') {
    await updateAccount(account.id, { kidSessionId: result.sessionId, kidClaimStatus: result.status })
    return send(res, 200, { status: result.status, unlocked: true })
  }
  send(res, 200, { status: result.status, unlocked: false })
}

// POST /api/me/age-group
// Reads the age k-ID's own age check recorded, picks the group, and stores
// only the group (never the age or birthday), plus the country code k-ID
// resolved from the connection, whose laws set the consent rules.
async function handleAgeGroup(req, res, account) {
  if (!isUnlocked(account)) return send(res, 409, { error: 'Finish the age check first.' })
  const session = await kid.getSession(account.kidSessionId)
  let age = null
  if (session.ageVerification?.verifiedAge != null) age = session.ageVerification.verifiedAge
  else if (session.dateOfBirth) {
    const dob = new Date(session.dateOfBirth)
    const now = new Date()
    age = now.getFullYear() - dob.getFullYear()
    if (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate())) age -= 1
  }
  const ageGroup = age != null ? groupForAge(age) : session.ageCategory === 'adult' ? 'adult' : null
  if (!ageGroup) return send(res, 502, { error: "k-ID didn't return an age for this account." })
  const country = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/.test(session.jurisdiction ?? '') ? session.jurisdiction : null
  const updated = await updateAccount(account.id, { ageGroup, country })
  send(res, 200, { account: auth.publicAccount(updated) })
}

// POST /api/me/class { classId }
async function handleSetClass(req, res, account) {
  const { classId } = await readJson(req)
  if (typeof classId !== 'string' || !/^[\w-]{6,64}$/.test(classId)) {
    return send(res, 400, { error: 'classId is required' })
  }
  const updated = await updateAccount(account.id, { classId })
  send(res, 200, { account: auth.publicAccount(updated) })
}

// DELETE /api/account -> delete the k-ID session, then the account.
async function handleDeleteAccount(req, res, account) {
  if (account.kidSessionId) await kid.deleteSession(account.kidSessionId)
  await deleteAccount(account.id)
  send(res, 200, { deleted: true })
}

// ---- AI steps ----
// Only a teacher account that k-ID says is a verified adult may run them.
async function isVerifiedAdultTeacher(account) {
  if (account.role !== 'teacher' || !isUnlocked(account)) return false
  const session = await kidSession(account, 5 * 60 * 1000)
  return Boolean(session?.ageVerification) && session.ageStatus === 'LEGAL_ADULT'
}

function teacherOnly(handler) {
  return async (req, res, account) => {
    if (!(await isVerifiedAdultTeacher(account))) {
      return send(res, 403, { error: 'Only a verified adult teacher can do this.' })
    }
    return handler(await readJson(req), res)
  }
}

async function handleBuild({ prompt }, res) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) {
    return send(res, 400, { error: 'prompt is required (up to 2000 characters)' })
  }
  send(res, 200, { lesson: await inworld.build(prompt.trim()) })
}

async function handleCurate({ lesson, ageGroup }, res) {
  if (!Array.isArray(lesson?.sections) || typeof ageGroup !== 'string') {
    return send(res, 400, { error: 'lesson and ageGroup are required' })
  }
  send(res, 200, { studySet: await inworld.curate(lesson, ageGroup) })
}

async function handlePicture({ description }, res) {
  if (typeof description !== 'string' || !description.trim()) {
    return send(res, 400, { error: 'description is required' })
  }
  send(res, 200, { image: await inworld.picture(description.slice(0, 400)) })
}

async function handleSpeak({ text, language }, res) {
  if (typeof text !== 'string' || !text.trim()) return send(res, 400, { error: 'text is required' })
  send(res, 200, { audio: await inworld.speak(text, typeof language === 'string' ? language : undefined) })
}

// POST /api/listen { audio, language } -> { transcript }
// Speech-to-text only (it can't generate content), and only when k-ID has
// ai-voice-mode on for this student.
async function handleListen(req, res, account) {
  if (!isUnlocked(account)) return send(res, 403, { error: 'Finish the age check first.' })
  const session = await kidSession(account)
  const voice = session?.permissions?.find((p) => p.name === 'ai-voice-mode')
  if (!voice?.enabled) return send(res, 403, { error: 'Voice is off for this account.' })
  const { audio, language } = await readJson(req)
  if (typeof audio !== 'string' || !audio || audio.length > 2 * 1024 * 1024) {
    return send(res, 400, { error: 'audio is required (a short clip)' })
  }
  const transcript = await inworld.listen(audio, typeof language === 'string' ? language : undefined)
  send(res, 200, { transcript })
}

const PUBLIC = {
  'POST /api/auth/register': handleRegister,
  'POST /api/auth/login': handleLogin,
  'POST /api/auth/logout': handleLogout,
}

const PRIVATE = {
  'GET /api/auth/me': handleMe,
  'POST /api/kid/claim': handleClaim,
  'POST /api/kid/session-ready': handleSessionReady,
  'POST /api/me/age-group': handleAgeGroup,
  'POST /api/me/class': handleSetClass,
  'DELETE /api/account': handleDeleteAccount,
  'POST /api/build': teacherOnly(handleBuild),
  'POST /api/curate': teacherOnly(handleCurate),
  'POST /api/picture': teacherOnly(handlePicture),
  'POST /api/speak': teacherOnly(handleSpeak),
  'POST /api/listen': handleListen,
}

const server = createServer(async (req, res) => {
  const key = `${req.method} ${new URL(req.url, 'http://x').pathname}`
  try {
    if (PUBLIC[key]) return await PUBLIC[key](req, res)
    const route = PRIVATE[key]
    if (!route) return send(res, 404, { error: 'not found' })
    const account = await auth.accountFromRequest(req)
    if (!account) return send(res, 401, { error: 'Please log in.' })
    await route(req, res, account)
  } catch (err) {
    if (err instanceof auth.AuthError) return send(res, err.status, { error: err.message })
    if (err instanceof kid.KidApiError) {
      console.error(err.message, err.body)
      return send(res, 502, { error: 'k-ID request failed' })
    }
    if (err instanceof inworld.LessonFormatError) {
      return send(res, 422, { error: err.message, regenerate: true })
    }
    if (err instanceof inworld.InworldError) {
      return send(res, 502, { error: err.detail ?? 'Inworld request failed' })
    }
    if (err instanceof SyntaxError) return send(res, 400, { error: 'invalid JSON' })
    console.error(err)
    send(res, 500, { error: 'internal error' })
  }
})

kid.checkSecretKey()
inworld.checkApiKey()
server.listen(PORT, () => console.log(`Cogteach server on http://localhost:${PORT}`))
