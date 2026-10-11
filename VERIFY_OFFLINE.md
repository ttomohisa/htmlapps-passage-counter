# Single-HTML and offline verification

This SIMD-only experimental HTML includes the complete AI model, JavaScript module, SIMD WASM and its loader, and all runtime JS/CSS; non-SIMD WASM and loader must be absent.

1. Run \`scripts/check-powershell-syntax.ps1\` and \`scripts/check-repository.ps1\`.
2. Verify that the embedded asset manifest has `mediapipe/module`, `mediapipe/simd-loader`, `mediapipe/simd-wasm` and `person-model/tflite` but **not** `mediapipe/baseline-wasm` or `mediapipe/baseline-loader`.
3. Confirm the model SHA-256 against \`model.config.json\` and the npm SHA-256 against \`dependencies.lock.json\`.
4. Confirm \`dist/index.html\` and \`passage-counter.html\` are byte-identical; self-extract restores the readable file.
5. Run the SIMD-only experiment CI. It uses fake Chrome camera inference, two `file://` HTML formats, a no-SIMD browser simulation (blocking camera before permission), tracking/ledger/CSV/i18n checks, and asserts no runtime external HTTP.
6. Independently verify Android Chrome / iOS Safari on real devices; measure CPU, heat and startup. Unsupported browsers cannot use this SIMD-only build.
7. The v0.4.0 browser CI should also test: IndexedDB session/events persistence across reload, recovery stopped after a crash, a missing coverage interval, 5/15/60 minute aggregation, CSV summary/events/intervals, confirmed deletion, and an IndexedDB-unavailable client retaining memory/CSV rescue.
8. In browser devtools, verify **zero external network requests** from model initialization through counting and export, except the original HTML page load when hosted. Retest with network disabled and a cold cache.

\`connect-src blob:\` grants only local WASM Blob reads; it must not be broadened to \`https:\`, \`http:\`, \`*\` or external hosts. A static scan is not proof of zero runtime requests.
