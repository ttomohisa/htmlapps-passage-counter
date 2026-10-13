# Third-party notices — Passage Counter v1.0.0 draft

These notices describe the **pinned build-time sources**. They are not an independent legal opinion or a statement that every stable-release redistribution gate is closed.

## MediaPipe Tasks Vision (JavaScript, SIMD WASM, loader)

- Dependency: `@mediapipe/tasks-vision@0.10.35`
- Source: https://github.com/google-ai-edge/mediapipe
- Package-declared license: **Apache-2.0**
- Offline copy of the Apache 2.0 license: [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt), copied from the upstream MediaPipe `LICENSE` file.
- Locked npm tarball SHA-256: `84597a25e13d123b5f4cbe768bb72e97a2c28c7a465f0ace287d8cbe5246bff0`
- Distribution: embedded ES module, SIMD WASM binary and matching loader. Non-SIMD loader/binary are deliberately excluded. Each delivered HTML contains the required model/runtime bytes and performs no SDK telemetry or external runtime fetch in the automated browser tests.
- **Standalone notice:** the build embeds the complete Apache-2.0 text from `licenses/Apache-2.0.txt` into a collapsible, readable section of the Help dialog, in both delivered HTML variants. The license is for MediaPipe runtime code, **not** the separate EfficientDet binary. Confirm whether the pinned compiled npm/WASM package includes additional required attribution/NOTICE text before declaring all redistribution obligations complete.

## EfficientDet-Lite0 (int8) person detection model

- Exact source: https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite
- Official task/model documentation: https://developers.google.com/edge/mediapipe/solutions/vision/object_detector
- Model SHA-256: `0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb`
- Local config now declares: **UNVERIFIED** rather than assuming the MediaPipe code license applies to this model.
- **Redistribution license status: UNVERIFIED (confirmed by actual binary inspection 2026-10-13).** Google's official examples recommend and download this exact URL. We downloaded the SHA-verified 4,602,795-byte TFLite file, parsed its embedded `TFLITE_METADATA`, and found `author=MediaPipe` but `license=null`. The storage object returned no model-specific license headers. A code-repository Apache-2.0 license is not, by itself, proof that redistribution of this separately hosted model binary is permitted. Obtain a grant from Google/the rights holder or switch to a model whose actual binary terms are explicitly documented. Evidence: [model inspection CI](https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/38339053721) and [audit procedure](docs/LICENSING_CSP_AUDIT_2026-10-13.md).

## Application code

- Passage Counter application source: MIT, see [LICENSE](LICENSE).
- Build dependencies are downloaded only at build time; production app never relies on an external model/WASM server.
- The generated HTML carries the full Apache-2.0 text for MediaPipe in Help. Additional compiled-binary/NOTICE and exact model-file redistribution rights still require a separate source-supported check. Do not treat the presence of the Apache text as clearance of the model.

See [docs/RELEASE_READINESS_v1.0.0.md](docs/RELEASE_READINESS_v1.0.0.md) for the remaining formal approval conditions.
