// Cogteach backend: claims k-ID age gate results with the secret key.
// Run with `npm run server`. KID_SECRET_KEY must be set in the environment
// (locally, a git-ignored .env file in the project root works).
import { createServer } from 'node:http'
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

const routes = {
  'POST /api/kid/claim': handleClaim,
  'POST /api/kid/session-ready': (req, res, id) => handleSessionReady(res, id),
  'GET /api/kid/session': (req, res, id) => handleGetSession(res, id),
  'DELETE /api/account': (req, res, id) => handleDeleteAccount(res, id),
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
    if (err instanceof SyntaxError) return send(res, 400, { error: 'invalid JSON' })
    console.error(err)
    send(res, 500, { error: 'internal error' })
  }
})

kid.checkSecretKey()
server.listen(PORT, () => console.log(`Cogteach server on http://localhost:${PORT}`))
