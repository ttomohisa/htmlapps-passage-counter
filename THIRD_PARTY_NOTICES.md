# Third-party notices — Passage Counter v0.9.0 draft

These notices describe the **pinned build-time sources**. They are not an independent legal opinion or a statement that every stable-release redistribution gate is closed.

## MediaPipe Tasks Vision (JavaScript, SIMD WASM, loader)

- Dependency: `@mediapipe/tasks-vision@0.10.35`
- Source: https://github.com/google-ai-edge/mediapipe
- Package-declared license: **Apache-2.0**
- Offline copy of the Apache 2.0 license: [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt), copied from the upstream MediaPipe `LICENSE` file.
- Locked npm tarball SHA-256: `84597a25e13d123b5f4cbe768bb72e97a2c28c7a465f0ace287d8cbe5246bff0`
- Distribution: embedded ES module, SIMD WASM binary and matching loader. Non-SIMD loader/binary are deliberately excluded. Each delivered HTML contains the required model/runtime bytes and performs no SDK telemetry or external runtime fetch in the automated browser tests.
- **Pre-release review:** verify the packaged tarball's LICENSE/NOTICE content and obligations against the precise fixed version; do not assume that links alone satisfy standalone redistribution.

## EfficientDet-Lite0 (int8) person detection model

- Exact source: https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite
- Official task/model documentation: https://developers.google.com/edge/mediapipe/solutions/vision/object_detector
- Model SHA-256: `0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb`
- Local config currently declares: **Apache-2.0**.
- **Redistribution license status: UNVERIFIED.** The official task guide provides the model download and type, but our review did not establish an explicit model-specific permission or license notice for **this exact hosted .tflite binary**. The config's `license` value does not itself prove permission. Resolve with authoritative model metadata/terms or substitute a clearly redistributable model before calling v1.0.0 release-ready.

## Application code

- Passage Counter application source: MIT, see [LICENSE](LICENSE).
- Build dependencies are downloaded only at build time; production app never relies on an external model/WASM server.
- Generated HTML alone contains the executable assets; the associated **license notice delivery for standalone redistribution** needs final legal/compliance review. The draft release readiness gate records this as unresolved.

See [docs/RELEASE_READINESS_v0.9.0.md](docs/RELEASE_READINESS_v0.9.0.md) for the remaining formal approval conditions.
