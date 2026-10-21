import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../kid/claim.js'
import { AuthContext } from './context.js'

// The token lives in sessionStorage, so each tab is its own login (teacher on
// the left, student on the right) and survives a reload. A new tab starts
// logged out, so logging out in one tab never logs out another.
const KEY = 'cogteach.token'

function readToken() {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

function writeToken(token) {
  try {
    if (token) sessionStorage.setItem(KEY, token)
    else sessionStorage.removeItem(KEY)
  } catch {
    // Storage blocked: the login lasts until the page reloads.
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(readToken)
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(Boolean(token))

  useEffect(() => {
    if (!token) return
    let cancelled = false
    api(token, 'GET', '/api/auth/me')
      .then(({ account }) => !cancelled && setAccount(account))
      .catch((err) => {
        if (cancelled) return
        if (err.status === 401) {
          writeToken(null)
          setToken(null)
        }
      })
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [token])

  const signIn = useCallback(async (mode, fields) => {
    const result = await api(null, 'POST', `/api/auth/${mode}`, fields)
    writeToken(result.token)
    setAccount(result.account)
    setToken(result.token)
    return result.account
  }, [])

  const signOut = useCallback(async () => {
    const old = token
    writeToken(null)
    setToken(null)
    setAccount(null)
    if (old) await api(old, 'POST', '/api/auth/logout').catch(() => {})
  }, [token])

  const value = useMemo(
    () => ({ token, account, loading, setAccount, signIn, signOut }),
    [token, account, loading, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
