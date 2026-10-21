import { Navigate } from 'react-router-dom'
import { Layout } from '../components/Layout.jsx'
import { useAuth } from './context.js'

// Shows children only to a logged-in account with this role.
export function RequireRole({ role, children }) {
  const { account, loading } = useAuth()
  if (loading) {
    return (
      <Layout>
        <p className="muted">Loading…</p>
      </Layout>
    )
  }
  if (!account || account.role !== role) return <Navigate to={`/login/${role}`} replace />
  return children
}
