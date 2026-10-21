// Username + password logins. Passwords are hashed with scrypt; tokens are
// random and stored server-side.
import { randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import {
  accountIdForToken,
  deleteToken,
  findAccountByUsername,
  getAccount,
  saveToken,
  updateAccount,
} from './store.js'

const scrypt = promisify(scryptCb)

export class AuthError extends Error {
  constructor(message, status = 400) {
    super(message)
    this.status = status
  }
}

async function hash(password, salt = randomBytes(16).toString('hex')) {
  const key = await scrypt(password, salt, 64)
  return `${salt}:${key.toString('hex')}`
}

async function matches(password, stored) {
  const [salt, hex] = stored.split(':')
  const key = await scrypt(password, salt, 64)
  return timingSafeEqual(key, Buffer.from(hex, 'hex'))
}

const ROLES = ['teacher', 'student']

// What the app may see about an account (never the password hash).
export const publicAccount = (a) => ({
  id: a.id,
  username: a.username,
  role: a.role,
  displayName: a.displayName,
  ageGroup: a.ageGroup ?? null,
  country: a.country ?? null,
  classId: a.classId ?? null,
})

async function issueToken(accountId) {
  const token = randomBytes(32).toString('hex')
  await saveToken(token, accountId)
  return token
}

export async function register({ username, password, role, displayName }) {
  const name = typeof username === 'string' ? username.trim().toLowerCase() : ''
  if (!/^[a-z0-9_.-]{3,30}$/.test(name)) {
    throw new AuthError('Usernames are 3 to 30 letters, numbers, dots, dashes or underscores.')
  }
  if (typeof password !== 'string' || password.length < 6 || password.length > 200) {
    throw new AuthError('Passwords need at least 6 characters.')
  }
  if (!ROLES.includes(role)) throw new AuthError('Pick teacher or student.')
  if (await findAccountByUsername(name)) throw new AuthError('That username is taken.', 409)

  const shown = typeof displayName === 'string' && displayName.trim() ? displayName.trim().slice(0, 30) : name
  const account = await updateAccount(randomUUID(), {
    username: name,
    role,
    displayName: shown,
    passwordHash: await hash(password),
    createdAt: new Date().toISOString(),
  })
  return { token: await issueToken(account.id), account: publicAccount(account) }
}

export async function login({ username, password, role }) {
  const name = typeof username === 'string' ? username.trim().toLowerCase() : ''
  const account = name ? await findAccountByUsername(name) : null
  const ok = account && typeof password === 'string' && (await matches(password, account.passwordHash))
  if (!ok) throw new AuthError('Wrong username or password.', 401)
  if (role && account.role !== role) {
    throw new AuthError(`That's a ${account.role} account. Use the ${account.role} login.`, 403)
  }
  return { token: await issueToken(account.id), account: publicAccount(account) }
}

export const logout = (token) => deleteToken(token)

// The account behind a request's "Authorization: Bearer <token>", or null.
export async function accountFromRequest(req) {
  const match = /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')
  if (!match) return null
  const id = await accountIdForToken(match[1])
  return id ? getAccount(id) : null
}

export const tokenFromRequest = (req) =>
  /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization ?? '')?.[1] ?? null
