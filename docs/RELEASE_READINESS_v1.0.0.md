# Passage Counter v1.0.0 — Release-readiness review

**Updated:** 2026-10-13
**Current outcome:** **NO-GO for unrestricted model-containing distribution**, pending model-specific redistribution terms and compiled-runtime notices.

The actual application code, standalone build and automated browser tests have passed. The owner explicitly re-scoped **physical-device/endurance verification and field-counting precision/recall to Future Work**; those items are not passed, and no precision/recall number is claimed. This is a scope change, **not** invented evidence. For provenance, see [Future Work](FUTURE_WORK.md), [the source requirements](../APP_SPEC.md) and [original development plan](../DEVELOPMENT_PLAN.md).

The latest [machine-readable gates](release-gates.v1.0.0.json) distinguish (1) immediate redistribution blockers, (2) verified hosted security policy, and (3) deferred field testing.

## Tested engineering requirements

| Verification | Current status and evidence |
| --- | --- |
| Dual standalone HTML (readable/self-extract) | Generated from pinned MediaPipe + EfficientDet model and SHA-checked assets; not dependent on a runtime CDN |
| Model identity | Official Google GCS source: 4,602,795 bytes, SHA-256 0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb verified |
| User input network behavior | Automated Chrome/Edge model startup, local video and offline HTML report no unexpected outbound HTTP and no SDK telemetry in exercised paths |
| Cloudflare Preview CSP | **VERIFIED**: live v1.0.0 HTTP 200, no response CSP header, enforcing meta CSP, Chrome bundled model initialized to ready with 0 CSP violations, 0 JS errors, 0 outbound HTTP requests |
| GitHub Pages response | HTTP 200 with meta CSP and no HTTP CSP header; current deployed badge read v1.1.0, different from the v1.0.0 PR |
| User interface | JA/EN, 320–1280px, Help scroll/X/Escape, counting line body and endpoints, 30-second camera check, counting actions and per-direction +1/−1 with Undo |
| Persistence/export | IndexedDB session recovery, event/correction/Undo audit log, observed vs missing intervals, 3 CSV exports, native local video and seek/reanalysis |
| Single-file copyright notice | Full MediaPipe Apache-2.0 license embedded in Help, from licenses/Apache-2.0.txt |
| Distribution rights for the separate model | **UNVERIFIED**: the exact model binary's embedded license metadata is null and the source response provides no license header |
| Additional compiled JS/WASM notices | **UNVERIFIED**: the npm package's precise NOTICE and attribution requirements still need an independent review |

For full evidence, reproducibility commands, scope caveats and public sources, see [licensing and CSP audit](LICENSING_CSP_AUDIT_2026-10-13.md). The new CI runs dedicated scripts/audit-model-license.mjs, scripts/audit-hosted-csp.mjs and scripts/audit-release.mjs, in addition to browser regression coverage.

## Current blocking items

### LICENSE-MODEL — exact model file's redistribution permission

Google provides this exact int8 EfficientDet-Lite0 model for download and use in its examples. That does not independently establish permission to **redistribute its model bytes inside someone else's self-contained HTML**. The model's own metadata has no license field, and GCS response license headers are absent. The local model.config.json now says UNVERIFIED rather than asserting Apache-2.0. Resolve by locating authoritative model-specific terms, obtaining permission from Google/the rights holder, or deliberately selecting a model with verifiable rights and re-running compatibility checks. Until then: **do not label model redistribution authorized**.

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
