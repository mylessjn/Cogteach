import { useEffect } from 'react'
import { clearId } from './storage.js'

// Removes a saved k-ID id once the flow it belonged to is finished.
export function ClearOnMount({ storageKey }) {
  useEffect(() => clearId(storageKey), [storageKey])
  return null
}
