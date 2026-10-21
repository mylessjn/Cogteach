// k-ID SDK configuration. The publishable key is safe to ship in the browser.
export const KID_PUBLISHABLE_KEY =
  'kgp_test_bhhk6gzpppaaaeyvireo5n5zozpbvkl6qo6nhr3kuwd3tqm6dbamc73a32guidi'
export const KID_BASE_URL = 'https://kai-api.test.k-id.com/fapi/v1'

// Integration manifest, applied to the product's TEST config only.
// Names come from node_modules/@k-id/core/PERMISSIONS.md. Keep this list in
// sync with the features Cogteach actually ships.
export const KID_DECLARE = {
  permissions: [
    { name: 'mods' }, // research library: players upload and browse topics
    { name: 'ai-voice-mode' }, // voice teaching (Inworld)
    { name: 'personalized-recommendations' }, // lessons matched to how a learner learns
  ],
  supportEmail: 'myles.sjn@gmail.com',
  // TODO: add privacyPolicyUrl, termsOfServiceUrl and iconUrl (PNG/JPEG) once
  // they exist. Left out, k-ID keeps its defaults. A live key needs all three.
}
