# ADR-004 — Local video analysis without uploading or storing the movie

Date: 2026-10-11
Status: **Draft v0.5.0 implemented; actual-phone and field accuracy gates pending**

## Purpose

Passage Counter remains a camera-first Browser Kitty tool, but now a user may select a prerecorded local movie and analyze crossings without an installation, login, cloud backend, or browser extension. This is the optional v0.5.0 milestone.

## Same engine, different clock

- The app reuses the existing **MediaPipe Tasks Vision 0.10.35 + EfficientDet-Lite0 int8 SIMD-only model** and **the same directional IoU/prediction tracker**. No new WASM or network dependency is needed.
- Video is decoded by the browser's standard \`HTMLVideoElement\` using a temporary \`blob:\` URL pointing to the user's File. There is no \`FileReader\` of the entire movie, no FFmpeg, server upload, transcoding, or recording of input.
- MediaPipe \`detectForVideo(video, timestamp)\` receives a strictly monotonic performance-based timestamp because MediaPipe requires it. The crossing tracker uses \`video.currentTime * 1000\` (media clock) instead of wall time; this keeps track associations tied to the source frames.
- For file-mode passage/adjustment/Undo events, the append-only event model stores numeric \`sourceTimeMs\` in both the ledger and IndexedDB \`PassageEventV1\`, and outputs it as \`source_time_ms\` in events CSV. Camera events keep this value null/blank.
- The v0.4.0 **5/15/60-minute time buckets remain analysis wall-clock buckets** for both input modes, not source-video buckets. This is explicitly labeled in file UI and README. For video positions use \`source_time_ms\`.

## Playback and resetting guarantees

1. Local picker and drag/drop accept candidate video files; only browser-decodable formats pass the \`loadeddata\` and frame/duration checks. A corrupt or unsupported file yields an error without contacting a server.
2. A local video can be previewed (play/pause, scrub when duration is known) and counting-line endpoints moved before counting. Preview frames **do not produce passage events**. The camera-only 30-second calibration is hidden for local video.
3. **Counting always rewinds to the beginning** of the video and starts only on an explicit user action. Pause/resume preserves video position. Reaching \`ended\` finalizes the session, and the app does not loop.
4. If a seek is requested after counting begins, the video pauses and asks for confirmation before discarding the previous analysis and its saved session. Rejected seek preserves the recorded events. Accepted seek resets the ledger, tracker, session and saved events, and a future Start again rewinds to frame zero. An unexpected browser-initiated seek stops counting and requires reanalysis.
5. Switching input sources or closing a file also requires confirmation when a session exists. File content and temporary Blob URL are released on close/switch/pagehide.

## File privacy, persistence, and recovery

The IndexedDB schema stays at version 1: a saved \`SessionV1\` may use \`sourceType: 'file'\`, and may retain numeric sourceDurationMs in runtimeInfo, plus coverage intervals and events. The **video bytes, File instance, Blob URL, file name, original audio, frame imagery, and person track IDs are never persisted**. Save failure warns and allows CSV rescue.

When reopened after page reload, a saved file session is for **review/export only**. It does not automatically request camera permission, reopen a movie, or continue counting. The operator must select the movie again and explicitly run a fresh analysis. The same device/browser-origin limits as v0.4.0 apply.

## Compatibility and performance

- WebAssembly SIMD and native gzip decompression are still required for the AI. Unsupported clients receive the existing localized explanation.
- Video codecs are the browser's responsibility. MP4/H.264, WebM/VP8/VP9, and sometimes MOV/HEVC vary by OS and browser; supporting an extension **does not guarantee decoding**.
- Some browser-playable WebM blobs lack finite duration metadata. The implementation tries a seek-based duration probe without copying file bytes. If duration remains unknown, playback may still be analyzed while timeline seeking is disabled.
- Only known local Blob URLs are created; CSP \`media-src blob:\` is allowed and \`connect-src blob:\` has no HTTP(S) destinations.
- No claim of stable mobile 8fps, accuracy, file length limit, memory footprint, or universal cross-browser formats is made until the later release gates.

## Verification

Source: \`scripts/smoke-video.mjs\` and \`.github/workflows/v05-local-video.yml\`. A real, browser-encoded VP8 WebM file is used as a fixture in Windows Chrome CI. Tests verify loading/decoding, preview seek, start from zero, confirmation/cancel behavior, clearing previous events on confirmed reanalysis, summary and event CSV (\`source_time_ms\`, \`source_type=file\`), saved session reloading with no movie in IndexedDB, mobile 320px layout, and opening directly from a standalone \`file://\` HTML. The existing \`scripts/smoke-browser.mjs\` covers camera/regression and self-extract. Runtime external HTTP requests are asserted to be zero.

The stacked Draft PR #5 extends the Cloudflare PR Preview and cleanup workflow's target branch to v0.4.0. Preview URL and deployment SHA must be read from real CI/PR comments, not guessed. The user merges PRs; ChatGPT never merges.
