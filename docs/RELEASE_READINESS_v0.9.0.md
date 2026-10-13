# Passage Counter v0.9.0 — Release Readiness / Go-No-Go

Date: 2026-10-11
Status: **DRAFT — RELEASE NOT APPROVED (NO-GO)**

v0.9.0 prepares release assets and reproducible verification. It is not permission to ship. Baseline: v0.8.0 Draft PR #8 plus the v0.9 release preparation branch. The user controls all PR merges.

Machine-readable gate list: [release-gates.v0.9.0.json](release-gates.v0.9.0.json). Automated CI can be Green while a field-release decision remains No-Go.

## Automated engineering checks

| Area | What the CI checks | Scope of evidence |
|---|---|---|
| Packaging | Build readable and self-extract single HTMLs, root copy and size report | No external runtime asset required in tested contexts |
| Network | Chrome/Edge synthetic camera, file open, local WebM | Unexpected external HTTP(S) request count 0 in exercised paths |
| CSP | HTML meta and test HTTP response header; violations | Actual Cloudflare header must be checked separately |
| Assets | Embedded model/SIMD WASM; pinned hashes | Model/WASM source identity, not licensing approval |
| UI | 320/360/390/820/1280px, EN/JA, help, accessibility | Automated layouts and script errors, not physical phone proof |
| Local state | IndexedDB crash restore, correction/Undo, CSV, missing intervals | Persistence and rescue in test browser |
| Local video | Decode/seek/EOF, export and no file persistence | Native WebM fixture; not all OS codec formats |
| Accuracy tools | Stress traces, one-to-one event matching, synthetic gate | Scoring code works; real-world accuracy still unknown |
| Documentation | Bilingual README, LICENSE, favicon and real browser screenshots | Pre-count actual UI without fabricated camera counts |

## Open HARD blockers — must remain UNVERIFIED until evidenced

1. **AC-04 accuracy.** At least 100 independently annotated, actual fixed-camera standard-condition passage events, including both directions and untouched holdout scenes. Evaluate direction-correct one-to-one Precision/Recall and require ≥95% target. No such validated 100+ event benchmark is in this PR (see ADR-007).
2. **AC-06 endurance.** Actual 30-minute fixed-camera recording on representative midrange phones, sustained inference fps/heat/battery/full-process memory, restored session, camera interruptions. Windows CI 20-second synthetic diagnostics do not count.
3. **AC-07 physical browsers.** Windows Chrome/Edge with real camera, Android Chrome and iPhone Safari end-to-end permission → line setup → calibration → counting → correction/Undo → finish → 3 CSVs. Confirm tab lock, rotation and offline HTML compatibility separately. Current automation does not establish these.
4. **LICENSE-MODEL.** Authoritative redistribution permission for pinned EfficientDet-Lite0 int8 model file, model SHA-256 0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb. An Apache-2.0 project license or model.config.json declaration is not independently sufficient for this exact binary.
5. **LICENSE-STANDALONE.** Verify the pinned NPM/WASM package's license/NOTICE obligations and how their full license text/attribution travels when the application is downloaded as a standalone HTML. An Apache 2.0 license copy is in licenses/Apache-2.0.txt, but this review remains open.

## Additional release checks

- Actual Cloudflare Preview/production HTTP CSP response headers and effective policies must be inspected, not inferred from localhost.
- Record actual browser, OS, device models, memory, fps and supported media formats in ADR-006.
- Capture screenshots from the **real generated UI** in Japanese/English and desktop/mobile. They must not show fabricated people, measurements or false accuracy claims.
- Retain precise third-party licenses, source URLs, version pinning and SHA-256 in THIRD_PARTY_NOTICES.md and the generated manifest. Ensure the downloadable package honors license conditions.
- Get consent/rights for any field footage; do not commit customer/visitor videos, faces or persistent personal IDs to the public repository.
- Verify use of single HTML, no runtime external HTTP, IndexedDB recovery, CSV formula escaping, keyboard/dialog focus, camera-denial error states, filename overflow, and mobile safe area.
- Keep the browser-tool project independent from Browser Kitty main/private repository; do not change the Browser Kitty site's existing top-page copy.

## Reproducible automated checks

1. Run PowerShell scripts/check-powershell-syntax.ps1, then scripts/check-repository.ps1.
2. Install CI-only Playwright from the pinned version 1.56.1 under .smoke.
3. Run node scripts/capture-release-screenshots.mjs to create 4 real UI images and their provenance.
4. Run node scripts/audit-release.mjs to verify icon, PNG sizes, HTML assets, versions, hashes, README references, third-party notices and blockers.
5. Run algorithm and accuracy regression tests followed by Chrome/Edge integration, local video, offline annotation and short-endurance browser tests.

The automated audit emits dist/release-audit.json with a separate automatedEngineering status and releaseDecision status. A PASS in engineering **does not** override the field/permission No-Go status.

## v0.9 decision record

**No stable release and no v1.0.0 tag.** With genuine new evidence, update the machine-readable gate list, this document and PR description together for manual review. Any release or merge remains the user's choice.
