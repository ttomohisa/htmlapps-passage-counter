# Third-party notices — Passage Counter v1.0.0 draft

These notices describe the **pinned build-time sources**. They are not an independent legal opinion or a statement that every stable-release redistribution gate is closed.

## MediaPipe Tasks Vision (JavaScript, SIMD WASM, loader)

- Dependency: `@mediapipe/tasks-vision@0.10.35`
- Source: https://github.com/google-ai-edge/mediapipe
- Package-declared license: **Apache-2.0**
- Offline copy of the Apache 2.0 license: [licenses/Apache-2.0.txt](licenses/Apache-2.0.txt), copied from the upstream MediaPipe `LICENSE` file.
- Locked npm tarball SHA-256: `84597a25e13d123b5f4cbe768bb72e97a2c28c7a465f0ace287d8cbe5246bff0`
- Distribution: embedded ES module, SIMD WASM binary and matching loader. Non-SIMD loader/binary are deliberately excluded. Each delivered HTML contains the required model/runtime bytes and performs no SDK telemetry or external runtime fetch in the automated browser tests.
- **Standalone notice:** the build embeds the complete Apache-2.0 text from `licenses/Apache-2.0.txt` into a collapsible, readable section of the Help dialog, in both delivered HTML variants. The SDK and model have independent upstream Apache-2.0 licensing evidence, while the binary-specific compilation provenance and third-party covered-source notices are tracked separately. Confirm whether the pinned compiled npm/WASM package includes additional required attribution/NOTICE text before declaring all redistribution obligations complete.

## Eigen and other compiled WASM dependency notices (precautionary bundling)

The source tree of MediaPipe v0.10.35 pins **Eigen** to revision `4c38131a16803130b66266a912029504f2cf23cd` and the `third_party/eigen.BUILD` file labels it **MPL-2.0 and BSD-style**. We have included the full upstream MPL-2.0 text, Eigen BSD and MINPACK notices and Eigen's license README in this repository, and the standalone build embeds them as accessible Help content alongside the MediaPipe Apache 2.0 and Passage Counter MIT texts.

- [Eigen pinned source](https://gitlab.com/libeigen/eigen/-/tree/4c38131a16803130b66266a912029504f2cf23cd)
- [MediaPipe v0.10.35 WORKSPACE](https://github.com/google-ai-edge/mediapipe/blob/v0.10.35/WORKSPACE)
- [MediaPipe Eigen BUILD license classification](https://github.com/google-ai-edge/mediapipe/blob/v0.10.35/third_party/eigen.BUILD)
- Included notice files: [MPL2](licenses/Eigen-MPL-2.0.txt), [BSD](licenses/Eigen-COPYING.BSD.txt), [MINPACK](licenses/Eigen-COPYING.MINPACK.txt), [upstream license guidance](licenses/Eigen-COPYING.README.txt).
- The precise npm `vision_wasm_internal.wasm` does **not** hash-match the `vision_wasm_internal.wasm` object referenced by `v0.10.35/third_party/wasm_files.bzl`. Therefore, the exact compiled-binary-to-source correspondence is **not independently established**. The pinned Eigen source link is a reference based on the source tag, not proof it built the distributed npm WASM.
- MPL-2.0 §3.2 concerns recipients' access to corresponding covered source if MPL code is included in an executable; this is a separate obligation from providing only its license text. See [compiled runtime provenance audit](docs/MEDIAPIPE_RUNTIME_LICENSE_2026-10-13.md).

This extra license text is a conservative compliance measure, not an assertion that optional upstream features such as MINPACK are actually bundled into this particular WASM.

## EfficientDet-Lite0 (int8) person detection model

**2026-10-13 authoritative update:** The previous "UNVERIFIED" model-binary status below was written before an explicit upstream licensing statement was found. [MediaPipe maintainer schmidt-sebastian](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830) says MediaPipe source **and models** are Apache 2.0 unless otherwise noted. [MediaPipe Object Detection team](https://github.com/google-ai-edge/mediapipe/issues/4906#issuecomment-1778649604) confirms Apache 2.0 commercial use for object models. The official EfficientDet-Lite0 int8 guide lists the exact model without a separate exception. We therefore document this model as **Apache-2.0 based on the upstream default grant**, with license text embedded in the HTML. The blank TFLite metadata is not evidence of an exception. [Expanded provenance and comparison](docs/EFFICIENTDET_MODEL_LICENSE_2026-10-13.md).



- Exact source: https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite
- Official task/model documentation: https://developers.google.com/edge/mediapipe/solutions/vision/object_detector
- Model SHA-256: `0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb`
- Local config declares **Apache-2.0 with exact upstream maintainer-policy evidence links**; this is not inferred merely from the runtime code license.
- **Historical forensic note (superseded by maintainer evidence above):** Google's official examples recommend and download this exact URL. We downloaded the SHA-verified 4,602,795-byte TFLite file, parsed its embedded `TFLITE_METADATA`, and found `author=MediaPipe` but `license=null`. The storage object returned no model-specific license headers. A code-repository Apache-2.0 license is not, by itself, proof that redistribution of this separately hosted model binary is permitted. The general model Apache-2.0 grant is subsequently documented in upstream maintainer comments linked above; no model exception was found in the official guide. Evidence: [model inspection CI](https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/38339053721) and [audit procedure](docs/LICENSING_CSP_AUDIT_2026-10-13.md).

## Application code

- Passage Counter application source: MIT, see [LICENSE](LICENSE).
- Build dependencies are downloaded only at build time; production app never relies on an external model/WASM server.
- The generated HTML carries full Apache-2.0 text in Help. The *model* license assessment is supported by the upstream maintainer statement above. **Additional compiled-JS/WASM third-party NOTICE and source-availability obligations remain under review.**

See [docs/RELEASE_READINESS_v1.0.0.md](docs/RELEASE_READINESS_v1.0.0.md) for the remaining formal approval conditions.
