# Passage Counter — Single-HTML size budget

The **fully self-contained HTML remains a product requirement**. This experimental branch intentionally supports WebAssembly SIMD browsers only; it includes the model, JS, SIMD WASM and loader, while excluding the non-SIMD fallback. The resulting narrower browser support is explicitly shown in the UI. Remote downloads are still forbidden.

## Historical dual-WASM sizes (Windows pwsh, 2026-10-11)

| Format | Previous gzip | Optimized gzip | Difference |
|---|---:|---:|---:|
| Readable \`dist/index.html\` | 13,635,491 B | **13,484,563 B** | **-150,928 B (-1.11%)** |
| Self-extract \`dist/index.self-extract.html\` | approximately 13.65 MB | **13,474,238 B** | generated fully offline |

Sizes are **bytes**, not remote compressed transfer sizes. A release's source date/build environment can slightly vary file size due to generated metadata.

### Bundle asset breakdown (optimized gzip)

| Embedded asset | Raw bytes | Stored bytes |
|---|---:|---:|
| EfficientDet-Lite0 int8 model | 4,602,795 | 3,403,074 |
| MediaPipe SIMD WASM | 11,153,617 | 3,279,600 |
| MediaPipe non-SIMD WASM | 10,481,398 | 3,189,583 |
| MediaPipe SIMD loader | 322,044 | 77,818 |
| MediaPipe non-SIMD loader | 321,847 | 77,756 |
| MediaPipe JS module | 136,948 | 39,635 |

The builder uses \`CompressionLevel.SmallestSize\` when the runtime supports it, otherwise the compatible \`Optimal\` fallback. The existing template asset format is unchanged: **gzip-compressed bytes, Base64 encoded once**, decoded with native \`DecompressionStream\`.

We investigated stripping WASM custom sections using a browser-side parser in CI. **Both historical WASM binaries have zero custom sections**, so stripping would save nothing. This newer experiment instead removes the non-SIMD WASM completely.

### Ongoing limits

\`app.config.json\` enables warning budgets of **10 MiB per HTML variant** in this experimental branch. The build reports exact sizes per variant and each embedded asset. Budgets are warning-only, matching the upstream \`htmlapps-template\` behavior. Every subsequent release should review \`dist/build-size-report.json\` and explain substantial growth before publication.

Do not substitute external model/CDN requests for a smaller HTML. A size improvement is accepted only if browser initialization, checksum, offline, security, and accuracy tests continue to pass.

## v0.5.0 local-video size target (2026-10-11)

The v0.5.0 branch adds browser-native local video decoding, picker/drop/seek controls, media timestamp storage and CSV support **without shipping a media decoder** (no FFmpeg or new WASM). Windows CI after video integration measured **9,215,580 bytes readable** and **9,133,588 bytes self-extract** (vs v0.4.0 at 9,190,008 and 9,125,692 bytes). Actual size may vary slightly with commits; the canonical report remains `dist/build-size-report.json`. Existing SIMD MediaPipe and full int8 model remain intact. [Video design](ADR-004-LOCAL-VIDEO.md).

## v0.4.0 offline-history size target (2026-10-11)

Adding IndexedDB session persistence, on-device time buckets and three CSV exports keeps the one-file readable HTML near **9.2 MB**, below the 10 MiB warning budget. The exact size is written to `dist/build-size-report.json` on every CI run. No new external runtime libraries were introduced; MediaPipe SIMD, the int8 model and gzip + Base64 asset storage are unchanged. Do not claim measured phone load times from Windows CI.

## Experimental SIMD-only size result (2026-10-11)

Full v0.3.0 HTML: **13,505,896 B**, SIMD-only HTML: **9,150,133 B** (save **4,355,763 B / 32.25%**). The self-extract file shrank from **13,481,830 B** to **9,112,468 B**. These are same-run full-UI measurements. Cold-camera timing in a single Chrome CI run was 735 ms versus 686 ms; no statistically significant startup or real-device fps improvement is claimed. Full evidence in [ADR-002](ADR-002-SIMD-ONLY.md).

## v0.3.0 UX and compression decision (historical dual-WASM baseline)

The model and both WASM variants remain gzip-compressed inside the single HTML, decoded with native `DecompressionStream` on initialization. The self-extracting variant compresses the entire HTML before the internal runtime assets are expanded; therefore it adds an initial decompression step. Neither variant requires network access after downloading/opening the original HTML.

**Do not trade away first-camera startup, phone memory headroom, or browser support to shave bytes.** The readable and self-extract HTML formats remain available (both SIMD-only); readable `dist/index.html` is the default for speed-sensitive use. Chrome CI validates SIMD inference, the unsupported-SIMD error path, `file://` loading and no outgoing HTTP. Real mobile startup times, memory peaks and battery performance are not yet validated; those are release gates in v0.6.0–v0.7.0. Updated v0.3.0 byte sizes should be taken from the PR's `dist/build-size-report.json`, not assumed to match the previous table.
