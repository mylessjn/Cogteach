import { useKidAgeGate, useKidJurisdictions, useKidSession } from '@k-id/core'
import { countryFlag } from './country.js'

// Where the player is, and the age rules k-ID applies there. The country is
// what k-ID resolved from the connection (jurisdiction="auto"), and every age
// comes from k-ID's requirements for it; nothing is hard-coded here.
export function CountryRules({ compact = false }) {
  const { requirements } = useKidAgeGate()
  const { session } = useKidSession()
  const places = useKidJurisdictions()
  if (!requirements) return null

  const code = session?.jurisdiction ?? null
  const place = code ? (places.find((p) => p.code === code)?.name ?? code) : null
  const { accessAge, minimumAge, civilAge } = requirements

  const rules = []
  if (minimumAge) rules.push(`Under ${minimumAge}: Cogteach isn't available.`)
  if (accessAge && accessAge > (minimumAge ?? 0)) {
    rules.push(`Under ${accessAge}: a parent or guardian says yes first, by email.`)
  }
  if (civilAge) rules.push(`${civilAge} and up: an adult, who can approve for others.`)

  return (
    <aside className={`country-rules ${compact ? 'compact' : ''}`} aria-label="Rules where you are">
      <p className="label">
        {code ? `${countryFlag(code)} ${place}` : '📍 Where you are'} · rules from k-ID
      </p>
      {!compact && (
        <p className="muted small">
          k-ID checks the laws where you are, so parent approval and which features are on follow
          them.
        </p>
      )}
      {rules.length > 0 && (
        <ul>
          {rules.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      )}
    </aside>
  )
}
