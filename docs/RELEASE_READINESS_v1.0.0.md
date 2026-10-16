# Passage Counter v1.0.0 — Release-readiness review

**Updated:** 2026-10-16  
**Decision:** **risk-managed GO** for the unchanged SHA-pinned v1.0.0 distribution. The owner has expressly accepted one remaining compiled-runtime source/NOTICE evidence gap. **This is not legal clearance.**

See [release gates](release-gates.v1.0.0.json), [WASM decision and reopening conditions](WASM_GO_RISK_DECISION_2026-10-16.md), and the original [compiled-runtime investigation](MEDIAPIPE_RUNTIME_LICENSE_2026-10-13.md).

## License/NOTICE review

| Component | Status |
| --- | --- |
| `LICENSE-MODEL`: EfficientDet-Lite0 int8 | **Verified licensing basis**: official MediaPipe maintainers state the source and models are Apache-2.0 unless otherwise noted; no exception identified for this official SHA-pinned EfficientDet model. |
| MediaPipe JS SDK `@mediapipe/tasks-vision@0.10.35` | The npm package declares Apache-2.0, and the tarball is SHA-pinned. |
| Standalone license text | The previous build audit verified Apache-2.0, Eigen MPL-2.0/BSD/MINPACK/README and Passage Counter MIT copies embedded in both single-HTML editions. |
| `LICENSE-STANDALONE`: compiled WASM mapping | **Not verified; risk accepted**. Exact compiled Eigen source and complete transitive NOTICE mapping are unknown; the known text and source pointers are provided. |
| Previous engineering/CSP checks | Windows Chrome/Edge automated tests passed on the earlier v1.0.0 candidate. Cloudflare Preview enforced inline meta CSP and initialized the model without observed external HTTP. Another host needs its own verification. |

The pinned npm tarball is SHA-256 `84597a25e13d123b5f4cbe768bb72e97a2c28c7a465f0ace287d8cbe5246bff0`. The distributed SIMD `vision_wasm_internal.wasm` is 11,153,617 bytes, SHA-256 `6a5c64584c2ab61c763b6e204afbdbc7ce1caf7f5216187322bca8df94f646bc`. MediaPipe `v0.10.35/third_party/wasm_files.bzl` instead references `e17fc0c480b79a16ad1756bb81ebd9a6c117b1ec4cad6084c6d6a417a6f426b7`. The public `v0.10.35` source pins Eigen commit `4c38131a16803130b66266a912029504f2cf23cd` ([source](https://gitlab.com/libeigen/eigen/-/tree/4c38131a16803130b66266a912029504f2cf23cd)), but this is **NOT verified corresponding source** for the different npm binary.

A hash mismatch only proves two WASM binaries differ, not why they differ or that a violation exists. Nonetheless, MPL-2.0 §3.2 can require source-availability for covered executable code; supplying license text alone does not establish compliance.

## Owner GO, with residual evidence risk

In [MediaPipe issue #6355](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5735201779), the exact npm WASM hashes, Eigen revision and modification/build manifest were requested. The [2026-10-05 maintainer reply](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830) supplied only general Apache-2.0 policy and did not bind the binaries to a source revision. This investigation could not complete that mapping.

On 2026-10-16, the owner authorized GO if this precise correspondence proved impractical to obtain. The `LICENSE-STANDALONE` status is **`risk_accepted`**, not `verified`. This is **not legal clearance** or a waiver of any notice/source condition; it is the owner's documented distribution decision for the exact pinned artifacts. Future dependency changes or new evidence require a new review.

`scripts/audit-release.mjs` and `scripts/audit-compiled-runtime-licenses.mjs` enforce the recorded acceptance and unchanged npm/WASM hashes. Their reports explicitly retain `correspondingSourceVerified: false` / `exactCorrespondingSourceVerified: false` and incomplete binary notice verification.

## Engineering scope and Future Work

Prior integration CI passed standalone builds, locale/UI/help checks, synthetic-camera MediaPipe startup, local video/CSV/session flows, CSP/offline checks and embedded licenses. These are historical CI results, not a new browser test made by this decision.

The owner explicitly deferred physical Windows/Android/iPhone camera validation, 30-minute endurance, and 100+ independently annotated real crossings with per-direction precision/recall **95% goal** to [Future Work](FUTURE_WORK.md). They are **not passed**. Do not portray this as independently validated counting or use outputs alone for safety, billing or legal decisions.

## Release operations

This GO does not merge a PR, publish a tag, or certify a different production host. Review current CI before merging the risk decision PR. Verify actual hosting CSP when deployment differs. Organizations requiring independently verified exact corresponding source/complete notices should request vendor attestation or legal review rather than treating this exception as proof.

**Verdict: GO with disclosed provenance/NOTICE evidence risk (not legal clearance); field accuracy and physical endurance remain unverified Future Work.**
