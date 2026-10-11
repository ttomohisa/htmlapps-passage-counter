# Passage Counter

Count **person-crossing events by direction** with a fixed phone or desktop camera and one draggable counting line. The complete application—including its AI model, JavaScript loader and **SIMD-only WASM**—lives inside one HTML file.

**This branch is a SIMD-only v0.3.0 technical preview, not the production default.** Browsers without WebAssembly SIMD cannot start the camera; the limitation is shown before camera permission. Person tracking and crossing decisions still require real-world evaluation and **not yet accuracy-validated**. Do not rely on these counts for safety, legal reporting or billing without independent checks.

## Features

- Live camera preview; permission is requested only after choosing **Start camera**.
- EfficientDet-Lite0 int8 person detection with MediaPipe Tasks Vision.
- Draggable line endpoints, reversible A/B direction, short-term prediction/IoU tracking, stable-side hysteresis, finite-line crossing, and directional counts.
- **30-second setup test** with isolated trial counts. The test can be stopped early and never contributes to the measured session.
- **A→B/B→A manual +1/-1**, zero-floor safety and single-step Undo. Automatic, correction and Undo events stay separate in the CSV.
- Custom direction labels, front/rear camera selection, person-box overlay toggle and locally remembered settings.
- Start, pause, resume, finish, elapsed-time display and downloadable UTF-8 CSV.
- English / Japanese, mobile-first responsive interface and attempted screen wake lock.
- No account, runtime CDN, remote inference, telemetry, upload or recording.

## Usage

1. Open a standalone HTML under HTTPS or locally in a browser that permits camera use for \`file://\`.
2. Fix the camera in place and include the entire passage in the frame.
3. Choose **Start camera**, grant permission, and adjust the two line endpoints.
4. Reverse the direction if necessary. Press **Start 30-second test** and walk across the line. You may stop the test early. Trial counts are excluded from the real session.
5. Press **Start counting**. Keep the page visible. Use **+1/-1** for either direction to correct misses or false counts, and **Undo** if the last correction was wrong.
6. Pause/resume if needed, finish, and export crossing events as CSV. You can rename the output file.

A person passing back across the line counts as another event. The number is **not a unique visitor count**. Crowding, occlusion, unusual viewpoints, glare, low light or camera motion can cause errors.

## Privacy and data

The camera requests video only, with audio disabled. Frames and short-term tracking data remain in browser memory. No video, still images, faces or sound are saved or transmitted. In v0.3.0, camera facing, line position, custom direction labels, and overlay preferences are kept in the browser's local storage (without any frames or device identifiers). Crossing records remain in memory until you export CSV. **Reloading or closing the page discards unsaved events**; persistence and recovery are planned for v0.4.0.

The runtime's CSP uses \`connect-src blob:\` so the WebAssembly loader can read *embedded in-memory* bytes through Blob URLs. No remote HTTP(S) origin is allowed. Consult local camera notice and privacy requirements before deploying in public or workplace locations.

## CSV event format

CSV fields: `event_id`, `occurred_at` (UTC ISO timestamp), `direction`, `direction_label`, `kind` (`auto`, `correction`, `undo`), `delta`, `elapsed_ms`, and `undo_of` (a correction event ID for Undo). Trial test events are **never exported**. The event list preserves corrections without modifying the auto-count history. Counts represent **crossings**, not unique people.

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

See [APP_SPEC.md](APP_SPEC.md), [DEVELOPMENT_PLAN.md](DEVELOPMENT_PLAN.md) and [VERIFY_OFFLINE.md](VERIFY_OFFLINE.md).

Build size and optimization measurements: [docs/SIZE_BUDGET.md](docs/SIZE_BUDGET.md).

## License

Application: MIT; dependencies and AI model: see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
