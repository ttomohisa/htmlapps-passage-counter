# Changelog

## SIMD-only v0.3.0 experiment — 2026-10-11 (Draft, not released)

- Preserve the complete EfficientDet int8 model, tracking, setup testing, corrections and CSV.
- Remove non-SIMD MediaPipe loader/WASM (no runtime network fallback).
- Detect unsupported SIMD environments and explain incompatibility in Japanese and English before camera permissions.
- Measure same-run size savings: **13,505,896 → 9,150,133 bytes, -32.25%**.
- Retest live synthetic camera inference, mobile layout, offline `file://`, and external HTTP zero. Mobile field compatibility still pending.


## [0.3.0] - 2026-10-11 (Draft)

- Added a timed **30-second calibration test** with a live trial count, manual stop and automatic finish. Test counts are kept separate from real session totals and CSV history.
- Added directional `+1/-1` corrections and Undo, with append-only audit events, zero-floor protection and editable direction names.
- Added front/rear camera selection, detection overlay switch, locally remembered line/settings, setup step guidance, and on-video mobile counters.
- Improved pause/configuration safety: calibration is invalidated by line movement or camera switching; a new test is required before counting again.
- Extended CSV event fields for direction labels and Undo references.
- Added deterministic ledger tests and browser smoke tests for setup, correction, export, Japanese/English and mobile layouts.
- Kept the AI model and SIMD/non-SIMD WASM inside each gzip-optimized one-file HTML, without new runtime dependencies.

## [0.2.0] - 2026-10-11 (Draft)

- Added prediction-assisted matching with IoU, object size and foot-point distance.
- Added track arming, stable-side hysteresis, direction re-arming and finite-segment intersections.
- Suppress uncertain matches and crossings after long detection gaps rather than creating inferred counts.
- Added 15 deterministic crossing, diagonal-line, jitter, simultaneous-passage, occlusion and reset tests.
- Disabled counting when line endpoints are too close, with localized guidance.
- Preserved the embedded AI model, both WASM variants, offline/privacy gates and bilingual UI.
- Reduced readable HTML from 13,635,491 to 13,484,563 bytes (-1.11%) with the strongest compatible native gzip level, without removing either WASM variant.

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
