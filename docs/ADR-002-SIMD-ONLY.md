# ADR-002 — MediaPipe SIMD-only experimental bundle

Date: 2026-10-11
Status: **Experimental, not merged or released**

## Decision under review

Prefer the existing SIMD runtime and drop the non-SIMD loader/WASM to make the fully self-contained HTML smaller. The model, JS loader, CSP, camera, person detector, prediction/IoU tracker, 30-second setup test, manual correction/Undo, and CSV behavior remain the same.

**Important:** v0.3.0 already selected SIMD on capable browsers. Removing the fallback **does not itself make those browsers infer faster**. Browsers without WebAssembly SIMD **cannot run this edition**; the app checks a small valid SIMD module using `WebAssembly.validate`, disables camera startup, and displays a localized reason without asking camera permission. There is no runtime fallback download.

## Side-by-side CI evidence

Windows Chrome, GitHub Actions run: https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/38096998636

| Generated one-file artifact | Full dual-WASM baseline | SIMD-only | Saving |
|---|---:|---:|---:|
| Readable HTML | **13,505,896 B** | **9,150,133 B** | **4,355,763 B (32.25%)** |
| Self-extract HTML | 13,481,830 B | 9,112,468 B | 4,369,362 B |

The **entire** application is included in both columns. The AI model is unchanged, with SHA-256 `0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb`. Both formats are gzip + Base64 embedded and operate without model/WASM downloads.

One synthetic Chrome CI run recorded:

| Operation | Full bundle (automatically selected SIMD) | SIMD-only |
|---|---:|---:|
| HTML load to DOMContentLoaded | 445 ms | 364 ms |
| Camera click to model ready | 735 ms | 686 ms |

These are **single-run diagnostics only**, not meaningful speed benchmark evidence. Ten real SIMD inference passes on fake video in the trial yielded a median 100.4ms; that is neither a phone benchmark nor a precision measure.

## Validation gates passed

- Template PowerShell syntax/build checks and exact root HTML verification.
- Model SHA-256 and WASM magic; SIMD loader+binary present, both non-SIMD assets absent.
- Chrome: ten `detectForVideo` calls on fake camera, tracking 15 scenarios, ledger/correction 6 scenarios, setup test/CSV, Japanese and English, 320px and landscape views.
- Readable and self-extract HTML open directly using `file://`, both initialize the embedded detector.
- Outbound HTTP(S) requests **0** during model initialization and operation.
- Simulated browser without SIMD blocks camera initiation and explains the limitation in both languages.
- CI comparison report `dist/simd-only-comparison.json`; startup report `dist/simd-boot-comparison.json`.

## Outstanding release gates

Android Chrome and iOS Safari **physical device** startup, battery/heat/memory, long recordings, crowd and backlight accuracy, and explicit browser-support decision. CI fake camera tests cannot prove field counting precision. This changes supported-browser coverage versus ADR-001 and must be reviewed before release. The user, not ChatGPT, merges pull requests.
