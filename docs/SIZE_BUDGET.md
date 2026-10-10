# Passage Counter — Single-HTML size budget

The **fully self-contained HTML is a product requirement**. The application must always include its model, module, loaders, and both SIMD/non-SIMD WASM binaries. Reducing browser coverage or using runtime downloads is **not** an acceptable size optimization.

## Measured CI sizes (Windows pwsh, 2026-10-11)

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

We investigated stripping WASM custom sections using a browser-side parser in CI. **Both WASM binaries have zero custom sections**, so stripping would save nothing. The two execution variants are intentionally retained to avoid dropping non-SIMD clients.

### Ongoing limits

\`app.config.json\` enables warning budgets of **13 MiB per HTML variant**. The build reports exact sizes per variant and each embedded asset. Budgets are warning-only, matching the upstream \`htmlapps-template\` behavior. Every subsequent release should review \`dist/build-size-report.json\` and explain substantial growth before publication.

Do not substitute external model/CDN requests for a smaller HTML. A size improvement is accepted only if browser initialization, checksum, offline, security, and accuracy tests continue to pass.
