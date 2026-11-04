# untag

Audio metadata cleanup for MP3 and WAV. Inspect metadata before replacing it, then download a clean file without re-encoding its audio.

## Local development

```sh
npm install
npm run dev
```

To run the Pages Functions locally after building:

```sh
npm run build
npx wrangler pages dev dist --port 8788
```

Firebase is optional. Copy `.env.example` to `.env.local` and provide the `VITE_FIREBASE_*` values to enable Google and email/password sign-in, cloud profiles, and tag-only job history. Audio is never stored in Firebase or on the server.

The inspect and clean endpoints buffer uploaded files in memory up to 100 MB. Set a suitable Workers CPU limit before production use; cleaning the supplied 30 MB WAVs is a synchronous in-memory operation.
