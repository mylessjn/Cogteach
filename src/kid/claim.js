// ============================================================================
// STUB: Cogteach has no backend yet.
//
// onClaim hands us a one-time claimToken as soon as the age check has a result
// (passed or pending). It must go to our backend right away; the backend then
// claims the result from k-ID using the SECRET key, which must never be
// shipped in the browser.
//
// TODO when the backend exists:
//   1. Add an endpoint (e.g. POST /api/kid/claim) that takes { claimToken },
//      claims it with k-ID server-side using the secret key, and stores the
//      result against the user's account.
//   2. Replace the body of sendClaimToken with the fetch below.
// ============================================================================
export async function sendClaimToken(claimToken) {
  console.warn(
    '[k-ID STUB] claimToken received but not sent: no backend yet.',
    claimToken,
  )

  // await fetch('/api/kid/claim', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ claimToken }),
  // })
}
