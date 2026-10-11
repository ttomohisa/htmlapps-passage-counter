# Passage Counter

Count **person-crossing events by direction** with a fixed phone or desktop camera and one draggable counting line. The complete application—including its AI model, JavaScript loader and **SIMD-only WASM**—lives inside one HTML file.

**This branch is a SIMD-only v0.5.0 technical preview, not the production default.** Browsers without WebAssembly SIMD cannot start the camera; the limitation is shown before camera permission. Person tracking and crossing decisions still require real-world evaluation and **not yet accuracy-validated**. Do not rely on these counts for safety, legal reporting or billing without independent checks.

## Features

- **Two input modes:** live camera (permission requested on Start camera) or local video (file picker and drag/drop).
- **Local video analysis** with browser-native video decoding, file preview/seek, counting from clip start, media-time event timestamps, and explicit confirmation before seeking/reanalysis invalidates results.
- Video file bytes remain on the device only, use Blob-backed streaming playback, are never stored with the session, and are released on close/page exit. Browser format support varies.
- Live camera preview; permission is requested only after choosing **Start camera**.
- EfficientDet-Lite0 int8 person detection with MediaPipe Tasks Vision.
- Draggable line endpoints, reversible A/B direction, short-term prediction/IoU tracking, stable-side hysteresis, finite-line crossing, and directional counts.
- **30-second setup test** with isolated trial counts. The test can be stopped early and never contributes to the measured session.
- **A→B/B→A manual +1/-1**, zero-floor safety and single-step Undo. Automatic, correction and Undo events stay separate in the CSV.
- Custom direction labels, front/rear camera selection, person-box overlay toggle and locally remembered settings.
- **IndexedDB saved sessions** with event-by-event atomic writes, periodic checkpoints, a saved-session list, deletion confirmation, and interrupted-session recovery without automatic camera restart.
- Observed/paused/missing time intervals (missing counts are not treated as zero), selectable 5/15/60-minute grouping, with local-time bucket summaries.
- Three UTF-8 BOM CSV exports: session summary, all events and time buckets, with preserved adjustment/Undo audit trails.
- On storage failure: visible warning and in-memory CSV rescue, without claiming records were saved.
- Start, pause, resume, finish and elapsed-time display.
- English / Japanese, mobile-first responsive interface and attempted screen wake lock.
- No account, runtime CDN, remote inference, telemetry, upload or recording.

## Usage

1. Open a standalone HTML under HTTPS or locally in a browser that permits camera use for \`file://\`.
2. Fix the camera in place and include the entire passage in the frame.
3. Choose **Start camera**, grant permission, and adjust the two line endpoints.
4. Reverse the direction if necessary. Press **Start 30-second test** and walk across the line. You may stop the test early. Trial counts are excluded from the real session.
5. Press **Start counting**. Keep the page visible. Use **+1/-1** for either direction to correct misses or false counts, and **Undo** if the last correction was wrong.
6. Pause/resume if needed; missing coverage is distinguished from zero crossings. Finish and export **events / summary / time buckets** as CSV. You can rename the output file.
7. Open saved sessions from the **Saved sessions** section after reloading. An interrupted session opens stopped; reconnect the camera, re-run the placement test, and manually start counting to resume.

A person passing back across the line counts as another event. The number is **not a unique visitor count**. Crowding, occlusion, unusual viewpoints, glare, low light or camera motion can cause errors.

## Local video analysis (v0.5.0)

Choose **Local video** under **Video source**, then choose or drag and drop a file (such as browser-decodable MP4 or WebM). The file is opened through a temporary local Blob URL; there is **no upload, file conversion or large whole-file read**. Pause/preview/seek to check the counting line before counting. Preview playback does not add counts, and **Start counting** rewinds to the beginning. The 30-second calibration test applies only to camera mode.

While analyzing, **Pause**, **Resume**, **Finish**, directional correction/Undo and all three CSV exports remain available. At the end of the video, counting finishes without looping. A seek or **Reanalyze from start** with recorded counts requires explicit confirmation and clears those counts, correction history and saved session before starting over. Browser-initiated seeks during active counting stop the session to prevent duplicate counts.

The event CSV includes numeric **`source_time_ms`** for the original video position, including manual corrections; camera events use an empty value. CSV summary uses **`source_type=file`** for prerecorded videos. Time buckets are by **wall-clock time when the analysis ran**, not the media timeline. Use `source_time_ms` when you need positions within the video. Video content, file name and Blob URL are **not persisted**; after refreshing you can inspect saved counts/CSV but must select the video again for a new analysis.

Browser-supported video formats vary by OS/browser and codec. MP4/H.264 and WebM/VP8/VP9 are common, but not universal; some browsers support MOV/HEVC while others do not. The app uses built-in decoders, not FFmpeg, and reports unsupported/corrupt inputs without uploading them. For WebM files lacking finite duration metadata, a browser-based duration probe is attempted; if still unknown, playback/counting can work while seeking remains unavailable.

## Privacy and data

The camera requests video only, with audio disabled. Frames and short-term tracking data remain in browser memory. No video, still images, faces or sound are saved or transmitted. In v0.5.0, camera facing, line position, custom labels, and overlay preferences use localStorage. **Sessions, direction counts, appended correction/Undo events, and observed/paused/missing coverage intervals are saved in IndexedDB** on the same browser origin. Images, audio, video, persistent person IDs, and camera device identifiers are not saved. An event and its session snapshot are committed in one transaction; a five-second checkpoint reduces crash-loss exposure. Browser storage can still be cleared, denied, or exhausted, so no uncommitted event is guaranteed to survive a crash. If storage fails, a visible warning tells you to export CSV before leaving.

The runtime's CSP uses \`connect-src blob:\` so the WebAssembly loader can read *embedded in-memory* bytes through Blob URLs. No remote HTTP(S) origin is allowed. Consult local camera notice and privacy requirements before deploying in public or workplace locations.

## Offline session recovery

When the tab is hidden or camera is lost, the current observed interval ends and the session becomes interrupted. After a hard crash, the last saved checkpoint is treated as the end of confirmed observation; elapsed time beyond it becomes an explicit **missing** interval. Loading the saved session never automatically resumes a camera, video or count. Video source bytes are deliberately not saved; a restored file session can be reviewed/exported but cannot resume playback without selecting the source again. A fresh placement test is required. Pauses are tracked separately. Saved sessions are per browser and origin: a downloaded `file://` HTML and a hosted `https://` copy do **not** share their IndexedDB records automatically. Concurrent editing of the same session in multiple tabs has not been validated; use one tab per active counter.

## CSV event format

CSV fields: `event_id`, `occurred_at` (UTC ISO timestamp), `direction`, `direction_label`, `kind` (`auto`, `correction`, `undo`), `delta`, `elapsed_ms`, and `undo_of` (a correction event ID for Undo). Trial test events are **never exported**. Local-video events include an actual numeric `source_time_ms`; the analysis clock remains the source of the existing 5/15/60-minute wall-time summaries. Additional event columns: `session_id`, `source_time_ms`, `event_kind_v1` (`auto`/`manual_adjustment`/`undo_adjustment`) and `reference_event_id`. The **summary** CSV includes observed/paused/missing milliseconds and automatic/manual/final counts by direction. The **interval** CSV includes the chosen bucket size, direction counts, valid seconds and coverage status. ISO timestamps are UTC; exports include a time-zone identifier. The event list preserves corrections without modifying the auto-count history. Counts represent **crossings**, not unique people.

## SIMD-only size experiment

Using the same EfficientDet model and complete counting UI, the generated HTML measured **13,505,896 B** (dual WASM) vs **9,150,133 B** (SIMD only), a **4,355,763 B / 32.25%** reduction on one CI runner. This does **not** imply faster inference: SIMD-capable browsers already selected SIMD in the old build. See [ADR-002](docs/ADR-002-SIMD-ONLY.md).

## Browser support

**WebAssembly SIMD is required.** Unsupported browsers are blocked before requesting camera permission, with a bilingual message. Desktop/Android Chrome and Edge are primary testing targets; Safari and Firefox need additional real-device verification. A browser must support camera permissions, WebAssembly, and gzip \`DecompressionStream\`. Hidden tabs and locked screens cannot be counted reliably.

## Fully bundled builds

The project follows [htmlapps-template](https://github.com/ttomohisa/htmlapps-template). Do not edit generated files; work in \`src/index.template.html\`.

\`\`\`powershell
.\scripts\check-powershell-syntax.ps1
.\scripts\check-repository.ps1
\`\`\`

The builder downloads exact dependencies **at build time only**, verifies the npm tarball SHA-256 and model SHA-256, embeds every required byte and creates:
- \`dist/index.html\`
- \`dist/index.self-extract.html\`
- \`passage-counter.html\` (byte-for-byte copy of readable HTML)

Generated manifests and a size report are in \`dist/\`. The CI browser smoke test uses a synthetic camera and verifies the AI initializes from the HTML and makes no external HTTP requests. A synthetic-camera test **does not establish counting accuracy**.

See [APP_SPEC.md](APP_SPEC.md), [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md), [VERIFY_OFFLINE.md](VERIFY_OFFLINE.md), [local persistence ADR](docs/ADR-003-LOCAL-PERSISTENCE.md) and [local video ADR](docs/ADR-004-LOCAL-VIDEO.md).

Build size and optimization measurements: [docs/SIZE_BUDGET.md](docs/SIZE_BUDGET.md).

## License

Application: MIT; dependencies and AI model: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
