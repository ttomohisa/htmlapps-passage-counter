# Third-party notices

## MediaPipe Tasks Vision

- Package: \`@mediapipe/tasks-vision@0.10.35\`
- Source: https://github.com/google-ai-edge/mediapipe
- License: Apache License, Version 2.0 — https://www.apache.org/licenses/LICENSE-2.0
- Included in SIMD-only experiment: ES module, SIMD WASM binary and matching loader; non-SIMD binaries are excluded.

## EfficientDet-Lite0 (int8) model

- Source: https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite
- Documentation: https://ai.google.dev/edge/mediapipe/solutions/vision/object_detector
- SHA-256: \`0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb\`
- Upstream license notice: Apache-2.0 (confirm the model-specific distribution terms before the stable public release).

Both are downloaded for build-time embedding only; the built app does not download them at runtime. The application itself is MIT-licensed.
