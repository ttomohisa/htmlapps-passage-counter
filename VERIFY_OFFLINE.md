# Single-HTML and offline verification

The model, JavaScript loader, both WASM runtime variants and runtime JS/CSS must be inside the HTML **from v0.1.0 onward**.

1. Run \`scripts/check-powershell-syntax.ps1\` and \`scripts/check-repository.ps1\`.
2. Inspect \`dist/dependency-manifest.json\`; verify assets: \`mediapipe/module\`, \`mediapipe/simd-loader\`, \`mediapipe/simd-wasm\`, \`mediapipe/baseline-loader\`, \`mediapipe/baseline-wasm\`, and \`person-model/tflite\`.
3. Confirm the model SHA-256 against \`model.config.json\` and the npm SHA-256 against \`dependencies.lock.json\`.
4. Confirm \`dist/index.html\` and \`passage-counter.html\` are byte-identical; self-extract restores the readable file.
5. Run \`scripts/smoke-browser.mjs\` via the CI workflow. This tests HTML-contained model initialization using a synthetic camera and rejects outbound HTTP.
6. Independently test camera access, detection, counting, dialog scrolling, Japanese/English, portrait/landscape, and foreground interruption on real mobile and desktop browsers.
7. In browser devtools, verify **zero external network requests** from model initialization through counting and export, except the original HTML page load when hosted. Retest with network disabled and a cold cache.

\`connect-src blob:\` grants only local WASM Blob reads; it must not be broadened to \`https:\`, \`http:\`, \`*\` or external hosts. A static scan is not proof of zero runtime requests.
