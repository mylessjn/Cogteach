// Cogteach backend: claims k-ID age gate results with the secret key, and runs
// the teacher-only Inworld steps (Build, Curate, Speak).
// Run with `npm run server`. KID_SECRET_KEY (.env) and INWORLD_API_KEY
// (.env.local) must be set; both files are git-ignored.
import { createServer } from 'node:http'
import * as inworld from './inworld.js'
import * as kid from './kid.js'
import { deletePlayer, getPlayer, updatePlayer } from './store.js'

const PORT = Number(process.env.PORT) || 8787

// A player is unlocked only once a claim (or a later challenge check) has
// given us a k-ID session for them. Gate any server-side feature on this.
function isUnlocked(player) {
  return Boolean(player?.kidSessionId)
}

async function readJson(req) {
  let body = ''
  for await (const chunk of req) body += chunk
  return body ? JSON.parse(body) : {}
}

function send(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(data))
}

// STUB: Cogteach has no login yet, so the app sends an anonymous id it keeps in
// the browser. Swap this for the real authenticated user id.
function playerIdFrom(req) {
  const id = req.headers['x-player-id']
  return typeof id === 'string' && /^[\w-]{8,64}$/.test(id) ? id : null
}

// POST /api/kid/claim { claimToken }
// The only thing we accept from the app is the one-time claim token. The
// session or challenge id always comes from k-ID's answer, never the app.
async function handleClaim(req, res, playerId) {
  const { claimToken } = await readJson(req)
  if (typeof claimToken !== 'string' || !claimToken) {
    return send(res, 400, { error: 'claimToken is required' })
  }

  const result = await kid.claim(claimToken)
  const changes = { kidClaimStatus: result.status }
  if (result.type === 'session') {
    changes.kidSessionId = result.sessionId
  } else if (result.type === 'challenge') {
    changes.kidChallengeId = result.challengeId
  }
  const player = await updatePlayer(playerId, changes)

  send(res, 200, { type: result.type, status: result.status, unlocked: isUnlocked(player) })
}

// POST /api/kid/session-ready
// The app tells us onSession fired. If we're still waiting on a challenge,
// check it once with the challenge id we saved from the claim.
async function handleSessionReady(res, playerId) {
  const player = await getPlayer(playerId)
  if (isUnlocked(player)) return send(res, 200, { unlocked: true })
  // onSession can fire alongside onClaim, before the claim lands. Nothing to
  // check yet; the claim itself will unlock the player or save a challenge.
  if (!player?.kidChallengeId) return send(res, 202, { unlocked: false })

  const result = await kid.getChallengeStatus(player.kidChallengeId)
  if (result.status === 'PASS') {
    await updatePlayer(playerId, {
      kidSessionId: result.sessionId,
      kidClaimStatus: result.status,
    })
    return send(res, 200, { status: result.status, unlocked: true })
  }
  // Anything else: keep waiting for the app's next signal.
  send(res, 200, { status: result.status, unlocked: false })
}

// GET /api/kid/session -> the player's age and permissions, straight from k-ID.
async function handleGetSession(res, playerId) {
  const player = await getPlayer(playerId)
  if (!isUnlocked(player)) return send(res, 403, { error: 'not unlocked' })
  send(res, 200, await kid.getSession(player.kidSessionId))
}

// DELETE /api/account -> delete the k-ID session, then the player.
async function handleDeleteAccount(res, playerId) {
  const player = await getPlayer(playerId)
  if (player?.kidSessionId) await kid.deleteSession(player.kidSessionId)
  await deletePlayer(playerId)
  send(res, 200, { deleted: true })
}

// Only a k-ID verified adult may run the AI steps. The check reads the
// player's session from k-ID, never anything the app says about itself.
const verifiedUntil = new Map()
async function isVerifiedAdult(playerId) {
  if (verifiedUntil.get(playerId) > Date.now()) return true
  const player = await getPlayer(playerId)
  if (!isUnlocked(player)) return false
  const session = await kid.getSession(player.kidSessionId)
  const ok = Boolean(session?.ageVerification) && session.ageStatus === 'LEGAL_ADULT'
  if (ok) verifiedUntil.set(playerId, Date.now() + 5 * 60 * 1000)
  return ok
}

function teacherOnly(handler) {
  return async (req, res, playerId) => {
    if (!(await isVerifiedAdult(playerId))) {
      return send(res, 403, { error: 'Only a verified adult can do this.' })
    }
    return handler(await readJson(req), res)
  }
}

// POST /api/build { prompt } -> { lesson }
async function handleBuild({ prompt }, res) {
  if (typeof prompt !== 'string' || !prompt.trim() || prompt.length > 2000) {
    return send(res, 400, { error: 'prompt is required (up to 2000 characters)' })
  }
  send(res, 200, { lesson: await inworld.build(prompt.trim()) })
}

// POST /api/curate { lesson, ageGroup } -> { version }
async function handleCurate({ lesson, ageGroup }, res) {
  if (!Array.isArray(lesson?.sections) || typeof ageGroup !== 'string') {
    return send(res, 400, { error: 'lesson and ageGroup are required' })
  }
  send(res, 200, { version: await inworld.curate(lesson, ageGroup) })
}

// POST /api/speak { text } -> { audio } (base64 MP3)
async function handleSpeak({ text }, res) {
  if (typeof text !== 'string' || !text.trim()) {
    return send(res, 400, { error: 'text is required' })
  }
  send(res, 200, { audio: await inworld.speak(text) })
}

const routes = {
  'POST /api/kid/claim': handleClaim,
  'POST /api/kid/session-ready': (req, res, id) => handleSessionReady(res, id),
  'GET /api/kid/session': (req, res, id) => handleGetSession(res, id),
  'DELETE /api/account': (req, res, id) => handleDeleteAccount(res, id),
  'POST /api/build': teacherOnly(handleBuild),
  'POST /api/curate': teacherOnly(handleCurate),
  'POST /api/speak': teacherOnly(handleSpeak),
}

const server = createServer(async (req, res) => {
  const route = routes[`${req.method} ${new URL(req.url, 'http://x').pathname}`]
  if (!route) return send(res, 404, { error: 'not found' })

  const playerId = playerIdFrom(req)
  if (!playerId) return send(res, 401, { error: 'missing player id' })

  try {
    await route(req, res, playerId)
  } catch (err) {
    if (err instanceof kid.KidApiError) {
      console.error(err.message, err.body)
      return send(res, 502, { error: 'k-ID request failed' })
    }
    if (err instanceof inworld.LessonFormatError) {
      return send(res, 422, { error: err.message, regenerate: true })
    }
    if (err instanceof inworld.InworldError) {
      return send(res, 502, { error: 'Inworld request failed' })
    }
    if (err instanceof SyntaxError) return send(res, 400, { error: 'invalid JSON' })
    console.error(err)
    send(res, 500, { error: 'internal error' })
  }
})

kid.checkSecretKey()
inworld.checkApiKey()
server.listen(PORT, () => console.log(`Cogteach server on http://localhost:${PORT}`))
