// ============================================================================
// STUB: a JSON file standing in for a real database. It holds accounts
// (hashed passwords), login tokens and each account's k-ID session ids, on
// one laptop. Replace with a real database before real users.
// ============================================================================
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const FILE = join(dirname(fileURLToPath(import.meta.url)), 'data', 'players.json')

// { accounts: { [id]: account }, tokens: { [token]: { accountId, createdAt } } }
let db = null
let writing = Promise.resolve()

async function load() {
  if (db) return db
  try {
    db = JSON.parse(await readFile(FILE, 'utf8'))
  } catch (err) {
    if (err.code !== 'ENOENT') throw err
  }
  // Files from before accounts (v1 anonymous players) start fresh.
  if (!db?.accounts) db = { accounts: {}, tokens: {} }
  return db
}

function persist() {
  const snapshot = JSON.stringify(db, null, 2)
  writing = writing.then(async () => {
    await mkdir(dirname(FILE), { recursive: true })
    await writeFile(`${FILE}.tmp`, snapshot)
    await rename(`${FILE}.tmp`, FILE)
  })
  return writing
}

export async function getAccount(id) {
  return (await load()).accounts[id] ?? null
}

export async function findAccountByUsername(username) {
  const { accounts } = await load()
  return Object.values(accounts).find((a) => a.username === username) ?? null
}

export async function updateAccount(id, changes) {
  const data = await load()
  data.accounts[id] = { ...data.accounts[id], ...changes, id, updatedAt: new Date().toISOString() }
  await persist()
  return data.accounts[id]
}

export async function deleteAccount(id) {
  const data = await load()
  delete data.accounts[id]
  for (const [token, t] of Object.entries(data.tokens)) {
    if (t.accountId === id) delete data.tokens[token]
  }
  await persist()
}

export async function saveToken(token, accountId) {
  const data = await load()
  data.tokens[token] = { accountId, createdAt: Date.now() }
  await persist()
}

export async function accountIdForToken(token) {
  return (await load()).tokens[token]?.accountId ?? null
}

export async function deleteToken(token) {
  const data = await load()
  delete data.tokens[token]
  await persist()
}
