# ADR-001 — MediaPipe in a fully self-contained Passage Counter HTML

Date: 2026-10-11
Status: Original dual-WASM baseline; see the newer experimental [SIMD-only proposal](ADR-002-SIMD-ONLY.md).

## Decision

Use MediaPipe Tasks Vision ObjectDetector with EfficientDet-Lite0 (int8) for people-only detection. Include all executable assets in the template's \`StandaloneAssets\` bundle; never download these assets from application runtime.

## Pinned inputs

| Asset | Version / identifier |
|---|---|
| MediaPipe package | \`@mediapipe/tasks-vision@0.10.35\` |
| npm tarball SHA-256 | \`84597a25e13d123b5f4cbe768bb72e97a2c28c7a465f0ace287d8cbe5246bff0\` |
| Model | Google EfficientDet-Lite0 int8 revision 1 |
| Model SHA-256 | \`0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb\` |
| Runtime assets | \`vision_bundle.mjs\`, SIMD JS/WASM and non-SIMD JS/WASM |

The model is 4,602,795 bytes. Its official source URL appears in \`model.config.json\` and is used **only while building**. The build validates SHA-256 before storing the model in the bundle. HTML output embeds compressed bytes as base64; the reader decodes and expands bytes without network requests.

## Runtime bootstrap

1. Load embedded \`vision_bundle.mjs\` as a Blob module.
2. Make Blob URLs for the chosen bundled WASM loader and binary.
3. Decode the embedded model from the bundle as \`Uint8Array\`.
4. Initialize ObjectDetector with \`baseOptions.modelAssetBuffer\` and \`runningMode: 'VIDEO'\`.
5. Filter to the \`person\` label and run \`detectForVideo\` on live camera frames.
6. Feed bounding rectangles to the provisional short-term tracker for crossing events.

The model runner uses \`connect-src blob:\` because Emscripten may read its binary via \`fetch(blob:)\`; the CSP still has **no external HTTP(S) source**. Both the readable HTML and the self-extracting HTML are validated with this policy.

## Evidence

GitHub Actions on Windows (Chrome, fake video source):
- Template PowerShell encoding and repository build checks succeed.
- The resulting readable HTML is approximately **12.99MB**, the self-extracting HTML approximately **13.01MB**.
- A cold browser run initializes MediaPipe from the HTML and starts the camera.
- Direct opening of both \`dist/index.html\` and \`dist/index.self-extract.html\` via \`file://\` initializes the model and starts the fake camera.
- Test intercepts external requests and asserts zero outbound HTTP(S) requests.
- Source and model checksums are pinned. Chrome smoke test includes a decoded model SHA-256 and WASM magic verification.

Synthetic camera results demonstrate **runtime feasibility**, not counting accuracy on human traffic.

## Alternatives and risks

ONNX Runtime Web with a similarly licensed small person detector was considered a fallback only if MediaPipe could not run inside one HTML; the available runtime demonstrated feasibility and was retained. A full on-device performance comparison is pending.

Still needed before declaring the v0.1.0 milestone complete: real-person crossing tests, actual Android Chrome and iOS Safari behavior and performance, review of the model's redistribution terms, and confirmation of zero runtime telemetry on supported physical devices.

No CDN, hosted model, or separate local asset may be added as a workaround.

## v0.2.0 size review

Both WASM variants were kept. The browser-side WASM parser found no custom sections to strip. Switching compatible build-time gzip from default compression to the highest available built-in level reduced the readable HTML by **150,928 bytes (1.11%)** while keeping the asset protocol and runtime unchanged. See [SIZE_BUDGET.md](SIZE_BUDGET.md).
