import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// { token, account, loading, setAccount, signIn(mode, fields), signOut() }
export const useAuth = () => useContext(AuthContext)
