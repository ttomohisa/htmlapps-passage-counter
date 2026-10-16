# Changelog

## 2026-10-16 — v1.0.0 licensing disposition (no runtime change)

- The owner authorized **risk-managed GO** for the unchanged pinned MediaPipe 0.10.35 WASM after exact npm-to-Eigen source and complete third-party NOTICE mapping could not be established from upstream evidence.
- The license gate now records an explicit **accepted risk**, not a verified corresponding-source claim. Release checks fail if npm/WASM fingerprints or risk-acceptance metadata change, and report the exception.
- The earlier 2026-10-13 candidate NO-GO entries below are historical snapshots, superseded by the October 16 decision only. No new physical camera, mobile endurance or real-count precision testing is claimed.
- [Source and NOTICE decision record](docs/WASM_GO_RISK_DECISION_2026-10-16.md).

## [1.0.0] — 2026-10-13 (candidate UI/documentation milestone; stable **NO-GO**)

- Rewrote the Japanese/English Help dialog using Web Serial Terminal as the *layout* reference: compact header, accessible 44px X close button, scrollable Basics / Privacy / Limitations sections and a factual caution about counting accuracy.
- Fixed background page scrolling while Help is open. Native X, Escape and backdrop exit paths restore scroll position and keyboard focus; mobile dialog content scrolls independently.
- Unified the header and body maximum width (1240px) and side gutters at desktop/tablet/mobile viewports.
- Completely reorganized the Japanese and English README files following the PDF Organizer documentation structure, including badges, screenshots, demo/version clarification, features, usage, standalone build, privacy, CSV, browser limits, dependency notices and contribution/license.
- Added a dedicated browser regression suite for modal sizing, both locales, short mobile viewports, background scroll locking and restoration, keyboard focus and header/body edge alignment.
- Preserved the v0.10.0 camera/video, whole-line drag, 30-second check, per-tile +1/−1, Undo, IndexedDB, CSV, Model/WASM and local-only runtime behavior.
- Updated candidate version badges, README screenshots and CI artifact names to v1.0.0. No production publish, tag or merge was made.
- **Release decision stays NO-GO:** the required independent real-world accuracy dataset, physical Android/iPhone and 30-minute tests, specific model redistribution grant and actual deployed CSP response audit are not complete. See [v1.0.0 release readiness](docs/RELEASE_READINESS_v1.0.0.md).


## [0.10.0] — 2026-10-12 (Draft, A/B line interaction and UX redesign)

- Rebuilt the screen with directional counters **at camera height on desktop and immediately after the video on phones**, avoiding an inaccessible below-the-settings count area. The prominent camera button starts the first task; after initialization the 30-second check and then real counting are surfaced as the next actionable step. Correction/Undo and the 3 CSV exports stay in a distinct review panel.
- Enabled rigid-body translation of a counting line by dragging **anywhere along its central segment**, while retaining independent endpoint drag for resizing and rotation.
- Added a transparent SVG hit layer around the line and handles, so touch editing does not prevent vertical page scrolling elsewhere on the camera preview.
- Refined correction placement to the **top-right inside each A→B / B→A count tile**, with separate 44px −1/+1 touch targets; moved Undo alongside the total. Removed the redundant lower correction section; existing event-ledger, disabled/zero-floor guard, and CSV behavior are unchanged. Verified narrow mobile geometry.
- Kept **the line itself draggable without an extra centre grip**; finite-line hit testing, rigid boundary clamp, pointer capture, Shift/Arrow keyboard nudge and durable line persistence remain.
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
