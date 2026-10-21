// k-ID SDK configuration. The publishable key is safe to ship in the browser.
export const KID_PUBLISHABLE_KEY =
  'kgp_test_bhhk6gzpppaaaeyvireo5n5zozpbvkl6qo6nhr3kuwd3tqm6dbamc73a32guidi'
export const KID_BASE_URL = 'https://kai-api.test.k-id.com/fapi/v1'

// Public https origin the legal pages (public/privacy.html, public/terms.html)
// are served from. They're deployed to Firebase Hosting with
// `npm run deploy:legal`; set VITE_SITE_URL to use another host.
const SITE_URL = import.meta.env.VITE_SITE_URL || 'https://cogteach-bea50.web.app'

// Integration manifest, applied to the product's TEST config only.
// Names come from node_modules/@k-id/core/PERMISSIONS.md. Keep this list in
// sync with the features Cogteach actually ships.
export const KID_DECLARE = {
  permissions: [
    { name: 'join-groups' }, // joining a class
    { name: 'ai-voice-mode' }, // hearing the Inworld voice and saying words into the mic
    { name: 'text-chat-private' }, // optional note to the teacher on a flag
    { name: 'leaderboard-and-rankings' }, // class leaderboard (12–18)
    { name: 'custom-avatar' }, // avatar picker (12–18)
  ],
  supportEmail: 'myles.sjn@gmail.com',
  iconUrl: '/icon.png', // bundled 512x512 PNG; the SDK sends it inline
  privacyPolicyUrl: `${SITE_URL}/privacy.html`,
  termsOfServiceUrl: `${SITE_URL}/terms.html`,
}

// Widgets match the app's look (see index.css).
export const KID_APPEARANCE = {
  variables: {
    colorPrimary: '#1865f2',
    colorText: '#21242c',
    colorSurface: '#ffffff',
    colorBorder: '#dbdcdd',
    fontFamily: "Lato, 'Noto Sans', Helvetica, sans-serif",
  },
}
