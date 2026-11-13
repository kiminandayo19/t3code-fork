# 08 Speak reply (Piper)

**Status:** Done, but **the Piper binary has never been executed by the agent** (blocked), so real synthesis and the install step are unverified. Check them first.
**Scope:** read an agent's latest reply aloud from the inspector and the result dialog.
**Done when:** **Speak** plays audio, preferring the environment's Piper voice and falling back to the browser's voice.
**Verify:** `speak.logic.test.ts`, `piperAssets.test.ts`, `http.test.ts` (speak endpoint), typecheck and lint.

## How it works

- `SpeakButton.tsx` cleans the reply with `spokenText` (`speak.logic.ts`: code blocks become "code omitted", links and markup dropped, capped near 1,500 characters at a sentence), then calls `synthesizeEnvironmentSpeech` (`packages/client-runtime/src/voice-input/environment.ts`) and plays the WAV. If that fails it uses `speechSynthesis`; with no voice at all it toasts.
- `POST /api/voice/speak` (`EnvironmentVoiceHttpApi` in `packages/contracts/src/environmentHttp.ts`; body `{ text }` up to 4,000 characters; returns `audio/wav`) requires the operate scope.
- `apps/server/src/speech/Piper.ts` (`PiperSpeech`) downloads Piper and the `en_US-lessac-medium` voice on first use, about 90 MB, into `<stateDir>/speech/piper`. It extracts with `tar`, writes the text to Piper's stdin, writes a temp WAV, and reads it back. Installs and syntheses each take one lock.
- `piperAssets.ts` pins each file's URL, size and SHA-256 for linux x64/arm64, macOS x64/arm64 and Windows x64. The server executes this binary, so a mismatch is rejected before extraction. To bump Piper, re-download and re-hash every file.
- `T3CODE_PIPER_BIN` and `T3CODE_PIPER_MODEL` (both) skip the download and use your own install.
- Starting a dictation recording cancels playback so the mic does not record the reply.

## Traps

- There is no progress or cancel for the first download; the button shows "Preparing voice..." and the request has the inference timeout.
- Chrome drops a `speak()` queued right behind a `cancel()`, so the browser path only cancels a stuck queue. Chrome on Linux often exposes no voices without `--enable-speech-dispatcher`.
- Piper's command line (`--model`, `--output_file`) comes from its docs, not from a run.

## Skipped

Voice picker, speed control, auto-speak, a download manager with progress, mobile.
