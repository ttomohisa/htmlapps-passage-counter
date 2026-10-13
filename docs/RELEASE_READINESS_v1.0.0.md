# Passage Counter v1.0.0 — Release-readiness review

**Updated:** 2026-10-13
**Current outcome:** **MediaPipe model default Apache-2.0 supported**; overall stable release NO-GO pending compiled-runtime third-party NOTICE/covered-source review.

The actual application code, standalone build and automated browser tests have passed. The owner explicitly re-scoped **physical-device/endurance verification and field-counting precision/recall to Future Work**; those items are not passed, and no precision/recall number is claimed. This is a scope change, **not** invented evidence. For provenance, see [Future Work](FUTURE_WORK.md), [the source requirements](../APP_SPEC.md) and [original development plan](../DEVELOPMENT_PLAN.md).

The latest [machine-readable gates](release-gates.v1.0.0.json) distinguish (1) immediate redistribution blockers, (2) verified hosted security policy, and (3) deferred field testing.

## Model licensing assessment updated

The prior "LICENSE-MODEL UNVERIFIED" evaluation was superseded by authoritative [MediaPipe maintainer evidence](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830) and [MediaPipe Object Detection team's answer](https://github.com/google-ai-edge/mediapipe/issues/4906#issuecomment-1778649604). MediaPipe source **and models** default to Apache 2.0 unless a different license is noted. No exception was identified for this official EfficientDet-Lite0 int8 model. The pinned 4,602,795-byte binary has not been changed, and full Apache-2.0 text accompanies the standalone HTML. The TFLite metadata's null license field is **not** a contrary exception. [Detailed evidence](EFFICIENTDET_MODEL_LICENSE_2026-10-13.md).

**Current remaining redistribution blocker:** complete compiled JavaScript/WASM third-party NOTICE and covered-source verification (LICENSE-STANDALONE). The current decision remains NO-GO pending that separate issue, *not because an express Apache2 model default has never been found*. Deferred real-device/precision work remains Future Work.

## Tested engineering requirements

| Verification | Current status and evidence |
| --- | --- |
| Dual standalone HTML (readable/self-extract) | Generated from pinned MediaPipe + EfficientDet model and SHA-checked assets; not dependent on a runtime CDN |
| Model identity | Official Google GCS source: 4,602,795 bytes, SHA-256 0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb verified |
| User input network behavior | Automated Chrome/Edge model startup, local video and offline HTML report no unexpected outbound HTTP and no SDK telemetry in exercised paths |
| Cloudflare Preview CSP | **VERIFIED**: live v1.0.0 HTTP 200, no response CSP header, enforcing meta CSP, Chrome bundled model initialized to ready with 0 CSP violations, 0 JS errors, 0 outbound HTTP requests |
| GitHub Pages response | HTTP 200 with meta CSP and no HTTP CSP header; raw HTML showed v1.1.0 but runtime badge showed v1.3.0, both different from this v1.0.0 PR. Current Pages model startup was not verified |
| User interface | JA/EN, 320–1280px, Help scroll/X/Escape, counting line body and endpoints, 30-second camera check, counting actions and per-direction +1/−1 with Undo |
| Persistence/export | IndexedDB session recovery, event/correction/Undo audit log, observed vs missing intervals, 3 CSV exports, native local video and seek/reanalysis |
| Single-file copyright notice | Full MediaPipe Apache-2.0 license embedded in Help, from licenses/Apache-2.0.txt |
| Distribution rights for the separate model | **VERIFIED from MediaPipe maintainer's Apache-2.0 default** (unless otherwise noted); the official recommended int8 model guide has no exception |
| Additional compiled JS/WASM notices | **UNVERIFIED**: the npm package's precise NOTICE and attribution requirements still need an independent review |

For full evidence, reproducibility commands, scope caveats and public sources, see [licensing and CSP audit](LICENSING_CSP_AUDIT_2026-10-13.md). The new CI runs dedicated scripts/audit-model-license.mjs, scripts/audit-hosted-csp.mjs and scripts/audit-release.mjs, in addition to browser regression coverage.

## Current blocking items

### LICENSE-MODEL — exact model file's redistribution permission

Google provides this exact int8 EfficientDet-Lite0 model for download and use in its examples. That does not independently establish permission to **redistribute its model bytes inside someone else's self-contained HTML**. The model's own metadata has no license field, and GCS response license headers are absent. The local model.config.json now says UNVERIFIED rather than asserting Apache-2.0. Resolve by locating authoritative model-specific terms, obtaining permission from Google/the rights holder, or deliberately selecting a model with verifiable rights and re-running compatibility checks. Until then: **do not label model redistribution authorized**.

### Pinned npm archive / Eigen compliance evidence (2026-10-13)

The archive for `@mediapipe/tasks-vision@0.10.35` was downloaded and SHA-verified against the checked-in lock: **13 files, no bundled LICENSE/NOTICE**, although its `package.json` declares **Apache-2.0**. The actual `vision_wasm_internal.wasm` is **11,153,617 bytes**, SHA-256 `6a5c64584c2ab61c763b6e204afbdbc7ce1caf7f5216187322bca8df94f646bc`, different from the upstream MediaPipe `v0.10.35` Bazel WASM SHA `e17fc0c480b79a16ad1756bb81ebd9a6c117b1ec4cad6084c6d6a417a6f426b7`.

The tagged upstream `WORKSPACE` pins Eigen `4c38131a16803130b66266a912029504f2cf23cd`, with its `third_party/eigen.BUILD` labeling the library MPL 2.0 and BSD-style. Complete upstream Eigen MPL/BSD/MINPACK/README notices and the Passage Counter MIT license were added to **both standalone HTML** Help screens, together with the MediaPipe Apache license. A build/audit test checks their presence. This is a conservative notice mitigation, not proof that the npm WASM uses that exact Eigen source revision or that every dependency is mapped.

The **remaining item is corresponding-source/provenance verification for the exact compiled npm WASM** (potential MPL §3.2 source availability), or explicit informed owner risk acceptance. [Exact tarball and source mapping report](MEDIAPIPE_RUNTIME_LICENSE_2026-10-13.md).

### LICENSE-STANDALONE — compiled binary notices

The runtime's Apache 2.0 text is now embedded within both standalone HTML editions in a readable Help appendix. This is a concrete mitigation but not proof that the pinned npm/WASM distribution carries no additional NOTICE or attribution requirements. Verify them against the specific delivered compiled components. Never apply the runtime code license automatically to the model.

## Deferred to Future Work (not release blockers by owner's current scope)

- **FW-01:** Real Windows Chrome/Edge camera, Android Chrome and iPhone Safari interoperability, mobile permission/interruption/recovery and 30-minute fps/temperature/battery/memory.
- **FW-02:** 100+ independently human-labelled *real* standard-condition crossings, both directions, untouched holdout, direction-sensitive Precision/Recall, 95% target and difficult-scene breakdown.

See [Future Work](FUTURE_WORK.md). These are **not executed and not verified**. Shipping under a deliberately limited, unvalidated experimental scope would require conspicuous product limitations; do not claim measured accuracy or guaranteed mobile reliability.

## CSP interpretation and next deployment

- The **actual Cloudflare PR #10 Preview** is compatible with the bundled app and its inline meta CSP in tested Chrome startup. An absent HTTP CSP header is not synonymous with absence of CSP.
- The **current GitHub Pages** version is different (v1.1.0 observed), so it must not be used as evidence of a newly merged v1.0.0.
- If Browser Kitty production later hosts a copy, run the header + actual-browser test against **that deployment** before asserting production CSP compatibility. A newly added server-level CSP could restrict Blob/WASM further.

## Version and release operations

No tag, release, Browser Kitty private-repo update, or PR merge is included in this audit. User controls merges.

**Final verdict today:** engineering/CSP **verified in the described scope**, physical/counting precision **deferred as explicit Future Work**, legal permission for the exact AI model and full compiled notice obligations **still unresolved**. This is a concrete distribution decision blocker, not an identified functional crash or defect.
