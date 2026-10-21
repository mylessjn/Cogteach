# Cogteach

A teacher writes one lesson prompt, and every student gets it in the form their
brain is ready for (based on Piaget's stages), with a verified adult checking
anything that reaches young kids.

Built with React (Vite), the k-ID Web SDK, Inworld (Gemini via Router, and TTS),
and Firebase Firestore.

## Run it locally

You need **Node 22.13 or newer** (`.nvmrc` says 24; with nvm, run `nvm use`).

1. Install dependencies. The k-ID SDK comes from `k-id-core-web.tgz` in this
   repo, so there's nothing extra to download.

   ```bash
   npm install
   ```

2. Set up the env files. Both are git-ignored.

   ```bash
   cp .env.example .env
   cp .env.local.example .env.local
   ```

   - In `.env`, set `KID_SECRET_KEY` (starts with `kgs_test_`).
   - In `.env.local`, set `INWORLD_API_KEY`.

   Ask Myles for both keys, privately. Don't paste them in chat channels or
   commit them. The Firebase values are already filled in and are public.

3. Run the backend and the app, in two terminals:

   ```bash
   npm run server   # k-ID claims + Inworld, http://localhost:8787
   ```

   ```bash
   npm run dev      # the app, http://localhost:5173
   ```

   Use port **5173**. The k-ID test key only allows that origin, so another
   port shows "Origin not allowed".

## Trying it

- **Teacher:** open `/teacher`, pass the age gate, then verify you're an adult
  (k-ID emails you a link; once per browser). Create a class, then use Create to
  generate, review and publish a lesson.
- **Student:** open `/student`, enter a name, the class join code and an age.
  Under 13 in the US, k-ID asks for a parent's email and waits for approval.
- One browser can hold the teacher and several student profiles, so you can run
  the whole demo in one window. Saved sessions live in that browser's
  localStorage.

## Notes

- Firestore is in test mode for the hackathon, so it is not secure. Don't use
  real student data.
- `npm run lint` and `npm run build` should both pass before you push.
- Legal pages: `public/privacy.html` and `public/terms.html` (drafts).
