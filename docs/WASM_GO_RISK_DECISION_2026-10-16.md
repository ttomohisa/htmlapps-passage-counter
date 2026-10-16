# Passage Counter v1.0.0 — compiled WASM source and NOTICE decision

**Date:** 2026-10-16  
**Decision:** **GO, with one explicitly accepted residual evidence risk**  
**Authority:** Project owner explicitly requested exact source/NOTICE investigation and permitted GO if obtaining definitive mapping proved impractical.  
**Not a legal opinion, a waiver, or proof of complete third-party compliance.**

## Confirmed evidence

- Actual npm dependency: `@mediapipe/tasks-vision@0.10.35`, 13-file tarball SHA-256 `84597a25e13d123b5f4cbe768bb72e97a2c28c7a465f0ace287d8cbe5246bff0`, published `package.json` license `Apache-2.0`; no license/NOTICE files included within its actual tarball inventory.
- Redistributed SIMD file: `package/wasm/vision_wasm_internal.wasm` (11,153,617 bytes), SHA-256 `6a5c64584c2ab61c763b6e204afbdbc7ce1caf7f5216187322bca8df94f646bc`. Passage Counter does not redistribute the non-SIMD executable.
- Official source: [MediaPipe v0.10.35](https://github.com/google-ai-edge/mediapipe/tree/v0.10.35) commit `f8ef212d5c962c0e853db7e59d217056b187084b`, [WORKSPACE Eigen revision](https://github.com/google-ai-edge/mediapipe/blob/v0.10.35/WORKSPACE) `4c38131a16803130b66266a912029504f2cf23cd`, [Eigen BUILD](https://github.com/google-ai-edge/mediapipe/blob/v0.10.35/third_party/eigen.BUILD) declaring MPL-2.0 and BSD portions.
- The same source tag's `third_party/wasm_files.bzl` has a **different** SIMD WASM SHA-256 `e17fc0c480b79a16ad1756bb81ebd9a6c117b1ec4cad6084c6d6a417a6f426b7`. Binary difference is proven; exact source difference is not.
- Existing single-HTML Help embeds full Apache 2.0, MIT and upstream Eigen MPL 2.0/BSD/MINPACK/README notice texts and an [Eigen tagged-source pointer](https://gitlab.com/libeigen/eigen/-/tree/4c38131a16803130b66266a912029504f2cf23cd). These are helpful compliance mitigations, **not proof of exact compiled source**.

## Investigation and remaining gap

[MediaPipe issue #6355's artifact-specific question](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5735201779) names these exact WASM hashes and asks for the source build commit, Eigen revision/modifications and complete source mapping. [Official reply dated 2026-10-05](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830) explains that MediaPipe source and models default to Apache 2.0 unless excepted, but does **not** supply the requested binary provenance; maintainers state this is the information available on GitHub.

Consequently, the tagged Eigen source is a **plausible source reference**, **NOT verified corresponding source** for npm's different-hash WASM. The exact compiled Eigen modifications and complete transitive third-party NOTICE inventory remain unknown. [MPL-2.0 §3.2](https://www.mozilla.org/en-US/MPL/2.0/) requires reasonable recipient access to corresponding covered source when applicable. A missing npm NOTICE and the public hash mismatch do **not** establish a license violation, but neither prove that all obligations are satisfied.

## Decision scope and reopening

For the currently public, unchanged v1.0.0, the owner accepts this *evidence* gap while retaining license texts, source URLs, warnings and pinned checksums. The decision is deliberately recorded as `LICENSE-STANDALONE: risk_accepted`, **not** `verified`.

**Reassess and withhold automatic GO** if any npm/WASM/model bytes or version change, if upstream releases build provenance/new NOTICE requirements, or if credible evidence of missing MPL-covered source/attribution appears. The audits must reject changed npm/WASM hashes and preserve `exactCorrespondingSourceVerified:false` and `completeBinaryThirdPartyNoticeSetVerified:false` in their output.

Physical/mobile/endurance and 100+ independent real crossing accuracy remain [Future Work](FUTURE_WORK.md). This decision does not claim those checks passed.

**Outcome: GO under an explicit version- and checksum-scoped exception, not complete licensing verification.**
