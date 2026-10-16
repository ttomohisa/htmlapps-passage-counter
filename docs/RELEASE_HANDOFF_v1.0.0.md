# Passage Counter v1.0.0 — main integration handoff

Date: 2026-10-13

> **2026-10-16 update:** Integration PR #13 was merged into `main`; the proposed integration instructions below are historical. The project owner has now made a **risk-managed GO** decision for the SHA-pinned MediaPipe runtime after exact source/NOTICE provenance remained unavailable. This is **not legal clearance**. See [current decision](WASM_GO_RISK_DECISION_2026-10-16.md) and [machine-readable gates](release-gates.v1.0.0.json).
Release scope: **limited, unvalidated-person-counting tool**, only with disclosed constraints. **Do not represent it as an independently validated visitor counter.**

## Branch/PR approach

The existing development used numerous stacked PRs (PR #1–#12). As at this review, GitHub's `main` still serves **Single HTML App Starter v1.3.0**, not Passage Counter.

For a straightforward release, prepare **one new integration PR to `main`** with the complete latest Passage Counter v1.0.0 source tree, including the model/CSP/license audits and all existing counting/video/CSV features. The integration commit is a **tree snapshot of the latest verified audit branch**, with the current `main` as its sole parent. This avoids requiring the owner to merge 10+ stacked PRs in order.

Do not merge the stacked development PRs one by one after the integration PR is merged: they will be superseded by the same app code. The owner decides whether and when to close them.

## Required technical checks on integration PR

- Build the readable and self-extract standalone HTMLs from pinned files and validate byte-identical root alias.
- Validate Japanese/English, mobile widths (320, 360, 390, 820px), desktop, line drag and camera-only 30-second check.
- Run Chrome and Edge embedded-model synthetic-camera, local WebM/seek/reset, IndexedDB/correction/Undo, CSV, offline file://, and zero runtime network regression.
- Test the Help dialog close/ESC/backdrop and background scroll lock, all 3 usage sections and supplemental license accordion.
- Validate Apache 2.0 (MediaPipe SDK and model), MIT (Passage Counter), Eigen MPL-2.0/BSD/MINPACK copy texts are **actually included in the generated one-file HTML**, not just linked from the repository.
- Audit the real pinned npm tarball SHA-256, package license/NOTICE inventory and WASM hash against upstream-source references.
- Verify the Cloudflare Preview's actual HTTP header + enforced inline CSP, cold model initialization and no outbound HTTP.
- Re-capture the real PC/mobile Japanese/English screenshots in CI as evidence.
- Confirm no telemetry or user footage uploads in exercised flows, and that private Browser Kitty site remains untouched.

## Licensed-model and compiled-WASM decision

**EfficientDet-Lite0 int8 model:** Upstream MediaPipe maintainers explicitly say source and models are Apache-2.0 *unless otherwise noted*; object-model project member confirms commercial use under Apache-2.0. The recommended EfficientDet int8 variant has no found exception. Its SHA is pinned and unchanged. The fact that model-local metadata has no license field does not contradict the maintainers' statement.

**MediaPipe Tasks Vision JS/WASM:** npm `0.10.35` declares Apache-2.0, but its 13-file tarball has no LICENSE or NOTICE file. The source tag v0.10.35 pins Eigen MPL-2.0/BSD, and the compiled npm WASM's SHA is **not equal** to the tag's `wasm_files.bzl` SHA. This exact WASM-to-source revision/patch mapping remains **not confirmed**.

The app now carries the full Apache/MIT/Eigen-MPL/BSD/optional-MINPACK text in an independently usable single HTML, plus the best available upstream source links. This is a substantial mitigation, **not full proof of all compiled-component covered-source obligations**.

**Pending release-owner assessment:** choose either (a) await the MediaPipe maintainer's exact compiled-WASM source/NOTICE answer, or (b) explicitly accept the narrowly identified build-provenance residual risk with these notices, published source pointers and actual dependency hashes. A green CI must **not automatically turn this risk into a legal clearance**.

- Model evidence: [EFFICIENTDET_MODEL_LICENSE_2026-10-13.md](EFFICIENTDET_MODEL_LICENSE_2026-10-13.md)
- Compiled runtime evidence: [MEDIAPIPE_RUNTIME_LICENSE_2026-10-13.md](MEDIAPIPE_RUNTIME_LICENSE_2026-10-13.md)
- Detailed technical/CSP evidence: [LICENSING_CSP_AUDIT_2026-10-13.md](LICENSING_CSP_AUDIT_2026-10-13.md)
- Machine-readable gates: [release-gates.v1.0.0.json](release-gates.v1.0.0.json)

## Deliberately deferred to Future Work

- Real Android/iOS/Windows physical-camera tests, and 30-minute performance/thermal/battery/memory measurements.
- >=100 independently human-labelled real crossing events, 95% *goal* for per-direction precision and recall, without claims of meeting that goal.
- Record actual device and field limitations in README and the Help before use. [FUTURE_WORK.md](FUTURE_WORK.md)

These remain unverified and must not be shown as passing gates.

## User-controlled merge and publish

1. Review and merge **the new main integration PR only** (user action).
2. GitHub Actions `deploy-pages.yml` should rebuild the app from `main` and deploy it to GitHub Pages (if Pages is enabled). Verify the actual build and the deployed URL; a green Preview does not prove an unrelated deployment's CSP.
3. Verify that `https://ttomohisa.github.io/htmlapps-passage-counter/` shows **Passage Counter v1.0.0** rather than Starter, and camera/CSV/help work. Check actual HTTP headers and browser CSP once it is live.
4. Only after choosing the license risk approach and checking deployment should the user create the `v1.0.0` annotated Git tag. Do not tag based only on this document.
5. Adding this app to Browser Kitty's private site is a **separate** change and is not part of this integration PR.

The assistant may prepare branches, commits and PRs; it **must not merge** a PR.
