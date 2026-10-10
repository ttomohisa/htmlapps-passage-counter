# Changelog

## [0.2.0] - 2026-10-11 (Draft)

- Added prediction-assisted matching with IoU, object size and foot-point distance.
- Added track arming, stable-side hysteresis, direction re-arming and finite-segment intersections.
- Suppress uncertain matches and crossings after long detection gaps rather than creating inferred counts.
- Added 13 deterministic crossing, jitter, simultaneous-passage, occlusion and reset tests.
- Preserved the embedded AI model, both WASM variants, offline/privacy gates and bilingual UI.

## [0.1.0] - 2026-10-11 (Draft)

- Implemented initial camera capture, person detection, draggable line, provisional short-term tracking, directional counting, pause/resume/finish and CSV export.
- Embedded EfficientDet-Lite0 (int8), MediaPipe JavaScript module, SIMD and non-SIMD WASM loaders/binaries in every standalone HTML.
- Pinned npm tarball and model SHA-256 and kept the template's readable/root/self-extract artifact pipeline.
- Added Chrome synthetic-camera smoke tests, Japanese and English UI, mobile layout and local-only CSP.
- Adopted formal application specification and v0.1.0–v1.0.0 development plan.

### Not yet complete

- Real-device and field accuracy validation.
- Person ID tracking and crossing precision improvements (v0.2.0).
- Manual adjustments, session persistence and recovery (v0.3.0–v0.4.0).
