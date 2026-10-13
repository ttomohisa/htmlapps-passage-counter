# ADR-006 — v0.7.0 integration and browser compatibility

Date: 2026-10-11
Status: **Draft integration gate; NOT a claim of device support**

## Decision

Retain the SIMD-only, fully embedded MediaPipe + EfficientDet-Lite0 int8 runtime and both standalone HTML editions. No remote model fallback or expanded CSP. Add desktop Windows CI checking **Chrome and Edge**, simultaneously applied CSP meta and HTTP header, actual bundled inference with a simulated camera, bilingual UI/error states, CSV, and clean offline file startup.

Actual Android Chrome, iOS Safari, long-duration endurance and people-crossing accuracy remain separate acceptance gates.

## Compatibility matrix (initially pending v0.7 CI)

| Environment | HTTPS camera → count → CSV | Cold offline single HTML | Local video | Status |
|---|---|---|---|---|
| Windows Chrome CI / synthetic camera | v0.7 automated target | readable + self-extract via file URI | browser-encoded WebM regression | Pending CI |
| Windows Edge CI / synthetic camera | v0.7 automated target | readable via file URI | not in Edge suite | Pending CI |
| Windows Chrome/Edge physical camera | Not tested by v0.7 CI | file access depends on browser | codec-dependent | Manual |
| Android Chrome / fixed real camera | Not tested | Not tested | Not tested | Required manual gate |
| iOS Safari / fixed real camera | Not tested | Not tested | Not tested | Required manual gate |
| Firefox desktop | Not tested | Not tested | Not tested | Optional investigation |
| Desktop WebKit | Not tested | Not tested | Not tested | Not equivalent to iOS Safari |

Only update statuses from concrete logs: device model, OS/browser versions, date, build/hash, camera/file source, test result, and any limitations. Browser APIs absent on a local file mean a *skipped camera test*, not successful inference.

## What the automated workflow verifies

- Source → fully embedded standalone build with pinned model/WASM and recorded asset hashes.
- Regression of tracking, corrections, sessions, persisted coverage, CSV, local-video seek/reset, 20-second endurance and Wake Lock simulation.
- Both Windows browser channels in separate fresh contexts, blocking external HTTP and service workers. CSP violation events and uncaught page errors must be zero.
- Localhost runs with the shipped CSP meta **and the same policy additionally enforced by an HTTP header**. This is not a validation of actual Cloudflare response headers.
- JA/EN modal behavior and error translation for rejected video and simulated NotAllowedError camera permission. The latter is not a real OS permission test.
- Help/reset dialogs, Escape cancellation, 390px viewport overflow, local CSV with BOM and adjustment records.
- Offline mode enabled **before** first local standalone navigation, no old cache or Service Worker; check the bundled model, loader and WASM, and actual synthetic-camera inference where that browser exposes a local-file camera API.
- Both readable/self-extract HTML sizes and CI-only screenshots. Desktop measurements are never labeled as phone performance.

## Manual physical device test (not performed)

1. Record device, OS/build, browser, date, battery/thermal state and exact HTML SHA-256. Use HTTPS Preview for primary camera tests.
2. Start from a fresh origin. Check permission prompt occurs only after Start camera. Set endpoints, run a calibration test, count, +1/-1 and Undo, pause/resume, finish, export all 3 CSV files. Verify history after reload.
3. Compare JA/EN throughout the flow, at portrait/landscape and narrow widths. Include long names, help/reset dialogs, tap targets, bottom safe areas and accessibility reading labels.
4. Deny and revoke camera permission; switch tabs, lock the display, rotate the phone, force camera interruption. Confirm missing coverage, user-facing explanation and *manual* restart.
5. Load native-playable MP4/WebM, try preview and seek/reanalysis, inspect unsupported-file guidance and ensure video bytes/names are not persisted.
6. Download and open each standalone as a local file with network disabled. Record local-file camera permission outcomes **separately** from whether bundled assets decode.
7. Conduct a **30-minute** real fixed-camera run; measure actual inference fps across time, memory, heat and battery. The representative midrange phone target is 8 inference fps, not an established fact.
8. If tools permit, capture the full request/response log and actual Cloudflare CSP headers, and confirm no SDK telemetry or external HTTP at runtime.

## Unresolved release gates

- Previous 8.6 fps / 20-second diagnostic applies to Windows Chrome CI synthetic input only, not a mobile device.
- Android Chrome / iOS Safari, 30-minute endurance and thermal/memory behavior remain unverified.
- Precision and recall against independent ground truth of 100+ crossing events belong to v0.8.0. No 95% performance claim is allowed before measurement.
- SIMD-only runtime cannot run on browsers without WebAssembly SIMD.
- Localhost secure-context test is not an HTTPS field deployment; file URI support is independent of HTTPS compatibility.
- AC-01 through AC-10 still apply. A successful desktop CI cannot independently close physical-device gates.

## Procedure

Build: scripts/check-powershell-syntax.ps1, scripts/check-repository.ps1.
Install automation dependency for CI only: npm install --prefix .smoke --no-save --ignore-scripts playwright@1.56.1
Integration: node scripts/smoke-v07-integration.mjs
Workflow: .github/workflows/v07-integration.yml
PR branch: feat/passage-counter-v0.7.0, stacked onto feat/passage-counter-v0.6.0. Never auto-merge.
