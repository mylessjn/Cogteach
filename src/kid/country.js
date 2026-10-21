// Flag emoji for an ISO country code ("US", or a subdivision like "US-CA").
export function countryFlag(code) {
  const cc = String(code ?? '').slice(0, 2).toUpperCase()
  if (!/^[A-Z]{2}$/.test(cc)) return '📍'
  return String.fromCodePoint(...[...cc].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
}
