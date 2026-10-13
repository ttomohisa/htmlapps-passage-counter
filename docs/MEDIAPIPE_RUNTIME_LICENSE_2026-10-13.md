# MediaPipe Tasks Vision v0.10.35 compiled runtime — exact artifact and notice review

**Audit date:** 2026-10-13
**Distribution:** Passage Counter, both self-contained HTML outputs with original `@mediapipe/tasks-vision@0.10.35` ES module, matching SIMD JavaScript loader and WASM.
**Source of truth:** SHA-pinned npm tarball **actually downloaded and bundled** by the repository build, not the current npm latest or generic MediaPipe guidance.

## Observed package facts

The audited npm tarball is `https://registry.npmjs.org/@mediapipe/tasks-vision/-/tasks-vision-0.10.35.tgz`.

| Item | Result |
| --- | --- |
| `dependencies.lock.json` SHA-256 | `84597a25e13d123b5f4cbe768bb72e97a2c28c7a465f0ace287d8cbe5246bff0` |
| Downloaded tarball SHA-256 | **Identical to lock**, verified on a Windows GitHub Actions runner |
| Number of archive files | **13** |
| `package.json` license field | **Apache-2.0** |
| Tarball LICENSE, NOTICE, COPYING, AUTHORS files | **None found** (actual archive inventory, not assumption) |
| `package/wasm/vision_wasm_internal.wasm` | **11,153,617 bytes**, SHA-256 `6a5c64584c2ab61c763b6e204afbdbc7ce1caf7f5216187322bca8df94f646bc` |
| MediaPipe `v0.10.35` source-tag `third_party/wasm_files.bzl` SHA for `vision_wasm_internal.wasm` | **`e17fc0c480b79a16ad1756bb81ebd9a6c117b1ec4cad6084c6d6a417a6f426b7`** — *does not match the npm asset* |

These facts are reproducibly measured by `node scripts/audit-compiled-runtime-licenses.mjs`. JSON evidence (`dist/compiled-runtime-license-audit.json`) is published as a GitHub Actions audit artifact; see the v1.0.0 audit workflow.

**Important:** A missing `NOTICE` inside npm tarball does not prove that no attribution obligations exist for its compiled dependencies.

## Upstream software licensing and Eigen

- The source repository [google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe/tree/v0.10.35) publishes its source under the [Apache 2.0 license](https://github.com/google-ai-edge/mediapipe/blob/v0.10.35/LICENSE).
- The exact [MediaPipe v0.10.35 WORKSPACE](https://github.com/google-ai-edge/mediapipe/blob/v0.10.35/WORKSPACE) pins Eigen to **`4c38131a16803130b66266a912029504f2cf23cd`**, archive SHA **`1a432ccbd597ea7b9faa1557b1752328d6adc1a3db8969f6fe793ff704be3bf0`**.
- [`third_party/eigen.BUILD` at this tag](https://github.com/google-ai-edge/mediapipe/blob/v0.10.35/third_party/eigen.BUILD) declares Eigen license types **`reciprocal` (MPL 2.0) and `notice` (BSD portions)**.
- [Eigen upstream's license guidance](https://gitlab.com/libeigen/eigen/-/tree/4c38131a16803130b66266a912029504f2cf23cd) describes an MPL-2.0/BSD-style mixed-codebase. Mozilla's [MPL-2.0 §3.2](https://www.mozilla.org/en-US/MPL/2.0/) generally requires recipients of executables containing MPL-covered components to have a reasonably accessible **corresponding source**, in addition to license notice.
- The pinned source tag is *not* a proved build provenance for the **different-hash npm WASM**. We **cannot assert** the exact Eigen source/patches compiled into that npm binary or definitively identify every compiled dependency from the tarball alone. This is an explicit source-correspondence residual risk, not a demonstrated license violation.

Related upstream maintainer discussion: [MediaPipe issue #6355](https://github.com/google-ai-edge/mediapipe/issues/6355) contains a question asking Google to map the precise `tasks-vision@0.10.35` WASM to its actual source/Eigen revision; the public issue does not establish the missing exact binary-to-source mapping.

## Concrete changes to Passage Counter

The app already includes complete Apache 2.0 text in its single-file Help. This review further adds:

- Full **Eigen MPL-2.0** text from upstream, plus **Eigen BSD**, **MINPACK** and `COPYING.README` notices (MINPACK text is included conservatively; the audit does **not** claim that MINPACK is certainly present in the built WASM).
- Full **Passage Counter MIT** license text in the same Help notice appendix.
- The [pinned Eigen source tree](https://gitlab.com/libeigen/eigen/-/tree/4c38131a16803130b66266a912029504f2cf23cd) and upstream MediaPipe source references as readable source-availability pointers.
- Fail-closed build checks if any license text is missing or empty; the build HTML-escapes each notice into the standalone.
- A release mechanical audit that verifies every notice really appears in generated HTML and no placeholder remains.

The program's packaged AI model **is not replaced or modified**. The exact Google MediaPipe EfficientDet-Lite0 int8 file has a separate license basis: MediaPipe [maintainer policy](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830), default Apache 2.0 unless otherwise noted.

## Remaining review and release decision

The following distinction is essential:

- **Model redistribution (LICENSE-MODEL):** adequately supported by upstream maintainers' Apache 2.0 general model grant and no found EfficientDet exception, with full Apache text supplied.
- **JavaScript runtime:** npm package declares Apache-2.0, the upstream source is Apache-2.0, and the license text is supplied. The exact npm artifact is cryptographically tied to the package version.
- **Compiled WASM and transitive dependencies (LICENSE-STANDALONE):** **notice and source pointers provided**, including MPL-2.0, but **the exact binary-to-source revision/provenance is not proved** because the npm wasm hash differs from the release tag's `wasm_files.bzl` referenced object. This leaves a compliance *review/risk acceptance item*; do not mark it "all third-party notices verified" without additional evidence or explicit informed release decision.

There is no identified *functional* issue here: Windows Chrome/Edge synthetic-camera/offline/CSV tests and Cloudflare Preview CSP checks are green. This document is not a legal opinion or blanket license warranty.

Practical choices:
1. **Conservative:** ask MediaPipe maintainers for the exact npm WASM source/build commit, Eigen revision/patches and full transitive component notices; complete this mapping before declaring full legal clearance.
2. **Risk-managed release:** include license texts and source pointers above, explicitly document the unresolved exact WASM provenance and obtain informed approval to proceed with an experimental/user-facing release without claiming legal certainty.

Real mobile/physical-camera/30-minute testing and 100+ real crossing precision/recall remain [Future Work](FUTURE_WORK.md) under the owner's direction; they are not evidence of correctness.

## Verification commands

In the repository root (Windows PowerShell / Node 24), on the pinned v1 branch:

```powershell
./scripts/check-repository.ps1
node scripts/audit-release.mjs
node scripts/audit-compiled-runtime-licenses.mjs
node scripts/smoke-help-v1.mjs
```

The compiled license script uses npm at **build/audit time**, not from the user-facing HTML. Runtime outbound HTTP is still restricted by the app's CSP.
