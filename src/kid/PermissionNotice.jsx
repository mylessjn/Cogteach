import { useKidPermission } from '@k-id/core'
import { Link } from 'react-router-dom'

// What to show when a feature's permission is off. Follows the rule:
// PROHIBITED -> nothing at all; GUARDIAN and off -> "Ask a parent";
// PLAYER and off -> the player can turn it on in Settings.
export function PermissionNotice({ name, feature, settingsPath }) {
  const permission = useKidPermission().get(name)
  if (!permission || permission.enabled || permission.managedBy === 'PROHIBITED') return null
  return (
    <p className="muted small">
      {permission.managedBy === 'GUARDIAN'
        ? `${feature} is off. Ask a parent to turn it on. `
        : `${feature} is off. `}
      <Link to={settingsPath}>Settings →</Link>
    </p>
  )
}
