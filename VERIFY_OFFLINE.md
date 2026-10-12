# Single-HTML and offline verification

This SIMD-only experimental HTML includes the complete AI model, JavaScript module, SIMD WASM and its loader, and all runtime JS/CSS; non-SIMD WASM and loader must be absent.

1. Run \`scripts/check-powershell-syntax.ps1\` and \`scripts/check-repository.ps1\`.
2. Verify that the embedded asset manifest has `mediapipe/module`, `mediapipe/simd-loader`, `mediapipe/simd-wasm` and `person-model/tflite` but **not** `mediapipe/baseline-wasm` or `mediapipe/baseline-loader`.
3. Confirm the model SHA-256 against \`model.config.json\` and the npm SHA-256 against \`dependencies.lock.json\`.
4. Confirm \`dist/index.html\` and \`passage-counter.html\` are byte-identical; self-extract restores the readable file.
5. Run the SIMD-only experiment CI. It uses fake Chrome camera inference, two `file://` HTML formats, a no-SIMD browser simulation (blocking camera before permission), tracking/ledger/CSV/i18n checks, and asserts no runtime external HTTP.
6. Independently verify Android Chrome / iOS Safari on real devices; measure CPU, heat and startup. Unsupported browsers cannot use this SIMD-only build.
7. The v0.4.0 browser CI should also test: IndexedDB session/events persistence across reload, recovery stopped after a crash, a missing coverage interval, 5/15/60 minute aggregation, CSV summary/events/intervals, confirmed deletion, and an IndexedDB-unavailable client retaining memory/CSV rescue.
8. In v0.5.0, test true browser-decodable local videos with file picker and drag/drop, preview, seek/reanalysis confirmation, sourceTimeMs CSV, EOF finish, saved session reload without file bytes, unsupported file/error, camera regression, and `file://` playback. Inspect IndexedDB and confirm it contains **no movie bytes or Blob URL**, while output events include numeric video time.
9. For v0.6.0, validate that the shared Browser Kitty header/hero matches PDF Fill & Sign and Wi-Fi Share structurally, the header favicon and brand SVG URI match, EN/JA toggling preserves every control, and the local-processing badge is factually supported by zero-runtime-HTTP assertions. Run header geometry checks at 320/360/390/820/1280px and save bilingual PC/mobile screenshots.
10. Run `scripts/test-performance.mjs` and `scripts/smoke-endurance.mjs`. The latter runs 20 seconds with synthetic Chrome camera, captures diagnostic JS heap and fps, checks IndexedDB checkpoint, tab background/foreground and rotation. Never promote this to a physical-device 30-minute endurance result.
11. For Cloudflare PR #5, confirm the Preview URL in the PR comment resolves HTTP 200 and contains the latest v0.5.0 source; workflow checks use the current branch SHA, not a guessed URL.
12. In browser devtools, verify **zero external network requests** from model initialization through counting and export, except the original HTML page load when hosted. Retest with network disabled and a cold cache.

\`connect-src blob:\` grants only local WASM Blob reads; it must not be broadened to \`https:\`, \`http:\`, \`*\` or external hosts. A static scan is not proof of zero runtime requests.

13. For v0.7.0, run the Windows Chrome/Edge dual-CSP integration gate and fresh-context offline file-open checks via `scripts/smoke-v07-integration.mjs`. The browser's simulated camera does not prove phone or physical-camera compatibility; see `docs/ADR-006-INTEGRATION-AND-COMPATIBILITY.md` for the required Android/iOS/manual tests and evidence matrix.

14. For v0.8.0, run `node scripts/test-accuracy-evaluator.mjs` and `node scripts/evaluate-accuracy.mjs examples/accuracy/synthetic-manifest.json --json=dist/accuracy-example.json`. The synthetic fixture **MUST NOT** satisfy the 100+ independently labeled real-event requirement. Verify the exact uploaded SVG via `scripts/smoke-header.mjs`, the no-border Wi-Fi Share Help action, and offline `scripts/smoke-annotation.mjs` with zero HTTP. Use `docs/ADR-007-ACCURACY-EVALUATION.md` for evidence collection; neither the annotation helper nor synthetic score closes actual device/accuracy gates.

15. v0.9.0 release preparation: generate Japanese/English desktop and mobile screenshots from the built HTML via `node scripts/capture-release-screenshots.mjs`, then run `node scripts/audit-release.mjs`. This validates PNG dimensions, version/icon/hash integrity, CSV and manifest, and emits `dist/release-audit.json`. A successful automated audit does **NOT** override any open field, mobile or model-license hard gate. See `docs/RELEASE_READINESS_v0.9.0.md`.

16. v0.10.0 interaction/UI: run `node scripts/test-line-interaction.mjs` for rigid line-body/endpoint hit testing, then `node scripts/smoke-v010-ui.mjs` against the **actual generated single HTML** with real embedded-model initialization and browser-dispatched mouse/touch/keyboard gestures. Confirm the video stage permits mobile vertical page scrolling outside the line, and camera mode setup test is invalidated when the line moves. Preserve all prior video, CSV and privacy checks. Release decision remains No-Go in `docs/RELEASE_READINESS_v0.10.0.md`.
