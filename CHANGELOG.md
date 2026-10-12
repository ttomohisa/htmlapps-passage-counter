# Changelog

## [0.10.0] — 2026-10-12 (Draft, A/B line interaction and UX redesign)

- Rebuilt the screen as a camera-first workflow, keeping video, line placement, status, 30-second test and live counters/actions close together. Moved correction/Undo and the 3 CSV exports to a distinct review panel.
- Enabled rigid-body translation of a counting line by dragging **anywhere along its central segment**, while retaining independent endpoint drag for resizing and rotation.
- Added a transparent SVG hit layer around the line and handles, so touch editing does not prevent vertical page scrolling elsewhere on the camera preview.
- Added a centre grip, finite-line hit testing, whole-line boundary clamp, pointer capture, keyboard Shift/Arrow nudge and durable line persistence only when gestures finish.
- Preserved test invalidation on line edits and editing lock during active counting/testing. Camera/local-video, events/Undo, IndexedDB/CSV, model/WASM and network-free standalone remain unchanged.
- Added dedicated line-geometry tests, browser mouse/touch/keyboard regression and responsive workflow-order assertions. Re-capture real bilingual desktop/mobile README images from v0.10.0 UI.
- **No-Go remains:** physical Android/iOS and 30-minute device tests, independent 100+ real crossing accuracy, specific model redistributability and deployed CSP audits.


## [0.9.0] — 2026-10-11 (Draft, release preparation; NOT approved RC)

- Promoted application and generated standalone version metadata to v0.9.0, without changing the main camera/video/tracking logic.
- Added reproducible README screenshot capture from the genuine built HTML for Japanese/English and desktop/mobile, with provenance that counts and camera footage are not fabricated.
- Added offline package/version, embedded icon, model hash, runtime lock, CSV/asset and distribution checks for release QA.
- Added complete Apache 2.0 license text and documented fixed dependency and model SHA-256 plus the outstanding model-specific redistribution permission question.
- Added a release decision checklist and machine-readable hard-gate statuses. Automated checks and physical-device/field-accuracy evidence are reported **separately**.
- Retained all existing v0.8.0 accuracy tools and v0.7.0 browser/CSV/IndexedDB/dual-CSP test suites.
- **Still No-Go for stable release:** independently labeled 100+ real passages and required precision/recall, Android/iPhone physical 30-minute testing, and model-specific redistribution license approval.


## [0.8.0] — 2026-10-11 (Draft, accuracy evaluation tooling)

- Replaced the favicon and matching app-header icon with the exact user-supplied Passage Counter SVG (#16624f, 64×64, rx=16). Both standalone editions embed it.
- Made the header Help SVG action visually consistent with Wi-Fi Share: no background or border, 20px glyph, transparent minimum 44×44px touch target; added CSS/asset assertions.
- Added the self-contained offline evaluation HTML for human crossing-time labels, with video playback, draggable line endpoints, keyboard A/B and Undo, and BOM CSV output.
- Added a dependency-free accuracy evaluator with strict event time/CSV parsing, one-to-one direction-specific matching, TP/FP/FN and Precision/Recall by group, synthetic data exclusion and review-only evidence gate.
- Added automated evaluator regression including duplicate predictions, direction errors, ±1.5s boundary, independent holdout split, correction exclusion and no false release approval.
- Added ADR-007 field evidence protocol, holdout separation and required annotated 100+ real events. Included a deliberately synthetic fixture; **not a real performance metric**.
- Preserved all v0.7.0 local camera, local video, CSV and storage behaviors; carried forward browser/standalone/network and wake-lock checks.
- **Open:** independently annotated 100+ real fixed-camera crossing events and 95% target, Android/iPhone actual device tests and 30-minute performance/heat study.


## [0.7.0] — 2026-10-11 (Draft, integration verification)

- Added bilingual error-state stability for camera permission denial and rejected local video when switching languages. Localized media-preview and aggregation accessibility labels.
- Added Windows Chrome/Edge desktop integration smoke for actual embedded-model camera inference, session correction/CSV, mobile dialog Escape cancellation, and JA/EN errors.
- Added combined HTTP CSP-header plus standalone meta-policy checks, clean offline file-based initialization with service workers blocked, and no-outbound-HTTP assertions.
- Extended stacked PR Preview trigger to the v0.6.0 base branch; maintained one-HTML model/WASM distribution and inherited regression tests.
- Added an explicit browser compatibility matrix, manual device checklist and evidence boundaries in ADR-006.
- **Open:** Android Chrome and iPhone Safari physical testing, real 30-minute endurance/thermals/memory, actual Cloudflare CSP headers, and independently labeled precision/recall. No release approval is implied.


## [0.6.0] — 2026-10-11 (Draft, SIMD-only)

- Updated app header and hero to match the current Browser Kitty PDF Fill & Sign and Wi-Fi Share design: sticky pale header, app icon/name/version, EN/JA quick toggle, SVG Help, concise bilingual title and truthful local-processing indicator.
- Updated unsupported-browser messages to plain language and added bilingual 320/360/390/820/1280px layout assertions with screenshot artifacts.
- Added an adaptive CPU-only latest-frame inference pacer (105–225ms interval), no backlog, measured frame-rate and inference latency. Consumer status now reports `Recognizing` / `Processing is slow`; technical diagnostics are collapsed.
- Added a prolonged very-low-fps fail-safe that interrupts a live session and records missing coverage rather than pretending slow video is a zero count.
- Released decoded model and SIMD WASM caches plus initialization Blob URLs once the detector is running. Preserved fully embedded offline model and SIMD binary.
- Decoupled five-second IndexedDB checkpoints from full DOM updates and throttled timeline redraws. Removed copying all existing events on every newly persisted crossing.
- Fixed asynchronous Screen Wake Lock pause/release handling, foreground tab transition and orientation-change interruption, with resumed counting requiring explicit action.
- Added deterministic performance tests and 20-second Chrome synthetic-camera endurance/heap diagnostic. **Real midrange phone 8fps and 30-minute endurance are unverified** and remain release gates.


## [0.5.0] — 2026-10-11 (Draft, SIMD-only)

- Added local MP4/WebM/other browser-playable video input by file picker or drag/drop, using revocable local Blob URLs and browser-native decoding; no whole-video buffering, persistence, upload or external libraries.
- Reused embedded EfficientDet + MediaPipe SIMD and the existing directional crossing tracker, with actual file `sourceTimeMs` stored in event ledger, IndexedDB and CSV.
- Added preview/play/pause/seek controls, explicit confirmation and full session reset on seek/reanalysis, EOF completion and interrupted-state protection for unexpected seeking.
- Saved video-derived count sessions without persisting file names or video bytes; restored results can be viewed/exported but not automatically resumed.
- Preserved v0.4.0 camera, 30-second setup, adjustment/Undo, persistence, missing coverage, 5/15/60-minute *analysis-wall-time* summaries and three CSV exports.
- Added Chrome E2E tests with browser-encoded WebM (not simulated detection outputs), local `file://`, seek/replay, CSV source times and zero HTTP transfers. New Cloudflare PR Preview workflow configuration supports stacked PRs.
- Android/iPhone compatibility, large videos, battery/memory behavior and actual person-count precision remain pending.


## [0.4.0] — 2026-10-11 (Draft, SIMD-only)

- Persist named sessions to IndexedDB (versioned session records and append-only event store), writing each new event together with its session checkpoint in a single transaction.
- Restore finished or interrupted sessions from the local browser list; interrupted counts never restart automatically. Keep camera video and person-track IDs out of persistent records.
- Record observed, paused and missing coverage intervals, including unobserved time since the last durable checkpoint after a browser crash. Display 5/15/60-minute local-time groupings without equating missing coverage to zero crossings.
- Add summary, events and time-bucket CSV exports with UTF-8 BOM, formula injection safety, time-zone information, automatic/manual/final counts and undo references.
- Add local rename/open/delete controls with destructive confirmation, a prominent persistence-error warning and in-memory CSV rescue.
- Add deterministic session/coverage/ledger tests and full Chrome IndexedDB reload, interrupted recovery, deletion and blocked-storage E2E tests.
- Preserve the complete SIMD-only MediaPipe / EfficientDet runtime, standalone HTML and external HTTP zero. Mobile field validation remains pending.


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
