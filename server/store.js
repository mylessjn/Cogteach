// ============================================================================
// STUB: a JSON file standing in for a real database of player accounts.
// Replace with the real account store when Cogteach has one.
// ============================================================================
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'data', 'players.json')

let players = null
let writing = Promise.resolve()

async function load() {
  if (players) return players
  try {
    players = JSON.parse(await readFile(FILE, 'utf8'))
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
    players = {}
  }
  return players
}

function persist() {
  const snapshot = JSON.stringify(players, null, 2)
  writing = writing.then(async () => {
    await mkdir(dirname(FILE), { recursive: true })
    await writeFile(`${FILE}.tmp`, snapshot)
    await rename(`${FILE}.tmp`, FILE)
  })
  return writing
}

export async function getPlayer(playerId) {
  const all = await load()
  return all[playerId] ?? null
}

export async function updatePlayer(playerId, changes) {
  const all = await load()
  all[playerId] = { ...all[playerId], ...changes, updatedAt: new Date().toISOString() }
  await persist()
  return all[playerId]
}

export async function deletePlayer(playerId) {
  const all = await load()
  delete all[playerId]
  await persist()
}
