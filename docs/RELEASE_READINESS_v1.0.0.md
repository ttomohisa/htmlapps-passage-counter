# Passage Counter v1.0.0 — Release-readiness decision

Date: 2026-10-13
Status: **v1.0.0 engineering candidate — stable release NO-GO**

The user requested the v1.0.0 source version and a final UI/documentation improvement pass. That request authorizes preparing this versioned candidate and PR, not inventing missing independent evidence. The canonical release criteria remain in [DEVELOPMENT_PLAN.md](../DEVELOPMENT_PLAN.md) and [APP_SPEC.md](../APP_SPEC.md). The user merges PRs; ChatGPT does **not** merge or release.

Machine-readable review: [release-gates.v1.0.0.json](release-gates.v1.0.0.json). The preexisting 8 open items remain explicitly unverified.

## Source-reference changes in this candidate

- Based on the current public repository and PR #10, not on outdated Project memory.
- Help dialog patterned on Web Serial Terminal's source code: one fixed header with localized title and 44px accessible X; independently scrolling, sectioned description; phone-safe size; modal backdrop.
- Background is fixed at its original scroll position while help is open. X, Escape and backdrop click close the dialog and restore both the page scroll and keyboard focus, including repeated open/close and short mobile viewports.
- Header inner container and main content share the same 1240px maximum width and responsive horizontal gutters.
- Japanese and English README use the PDF Organizer README's organization, but *all functionality and limits must be Passage Counter's*, and the v1.0.0 candidate must not be presented as a publicly validated release.
- Preserve v0.10's camera/file input, drag-the-A/B-line, 30-second camera-only check, +1/−1 and Undo inside direction tiles, CSV, saved sessions/coverage, bundled SIMD/WASM and local-only processing.
- Update genuine desktop/mobile JA/EN screenshots from the generated HTML (not mockups), and the version in both single-HTML editions.

## Engineering quality checks

| Check | Method | Interpretation |
| --- | --- | --- |
| PowerShell/build | Syntax and repository scripts, SHA-locked model/runtime, readable/self-extract HTML | Complete standalone app produced, subject to licensing clearance |
| Icon and width | Exact favicon asset + header/body alignment at 320/360/390/820/1280px | Only automated viewport regression, not physical-device proof |
| Help modal | Real Chrome pointer/keyboard: JA/EN content, dialog scroll, X, Escape, backdrop and scroll restore at 320×568 and desktop | UI scroll/focus contract, not real iOS Safari |
| Camera/video regression | Chrome + Edge real embedded AI inference with synthetic camera, offline single HTML, native WebM | Does not prove real visitor counting accuracy |
| User data | IndexedDB events, missing coverage, undo and 3 CSV exports | Test fixtures and browser storage, no actual field audit |
| CSP/privacy | Cold start, local file and test HTTP CSP: no external HTTP attempts | Actual Cloudflare production response CSP must be audited separately |
| Model scoring | 14 evaluator scenarios, 8 tracker stress scenarios, synthetic dataset | Synthetic perfect data is never a real-world acceptance metric |
| Endurance | 20-second simulated Windows camera + Wake Lock | Not physical 30-minute phone testing |

## Unresolved blockers before tagging or promoting stable v1.0.0

1. **AC-04: Real-world accuracy.** Collect and independently label a holdout sample of at least 100 actual standard-condition passage events, in both directions. Report TP/FP/FN and direction-aware Precision and Recall; require each to achieve the 95% *target* with the agreed review protocol. No verified real corpus is present in the repo.
2. **AC-06 / AC-07: Devices and endurance.** Test real Windows Chrome/Edge camera capture, Android Chrome and iPhone Safari end-to-end; 30 minutes of real capture, thermal/battery/memory/FPS measurements, tab interruptions, local file, A/B control, checkpoint, CSV and recovery. Simulated Windows Chrome is not proof.
3. **LICENSE-MODEL.** Establish an authoritative redistribution grant for the exact hosted EfficientDet-Lite0 int8 TFLite file (SHA-256 0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb). A field in model.config.json or the MediaPipe code's Apache-2.0 license is not independent evidence for that model file.
4. **LICENSE-STANDALONE.** Verify correct LICENSE/NOTICE delivery with a standalone HTML distributed by itself.
5. **CSP-HOST.** Verify actual deployed Cloudflare Preview and production response CSP header versus the required Blob/WASM/embedded-asset permissions.

## Release decision

**NO-GO.** The v1.0.0 **candidate code** and automated CI may pass while the **stable release** is not approved. Do not merge, tag, publish, or claim field-tested 95% accuracy. Only change this document and the JSON gates when verifiable evidence and user review justify it.
