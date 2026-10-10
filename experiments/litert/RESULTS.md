# LiteRT.js with unchanged EfficientDet-Lite0 (int8): measured trial

Date: 2026-10-11 (JST)
Experiment branch: `experiment/litert-efficientdet-lite0`
CI run: https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/38091208751
Status: **PASS for raw CPU/WASM model inference**, **not ready to replace MediaPipe for people counting**.

## Question and invariants

Can LiteRT.js (`@litertjs/core@2.5.3`) execute the **exact same** SHA-256-pinned EfficientDet-Lite0 int8 model with a smaller fully offline standalone HTML, including compatible WASM binaries?

- The model is unchanged: `0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb`.
- The production Passage Counter v0.3.0 and its existing Draft PR #1 are untouched.
- The experiment's complete JS, model, loaders and both optimized/compat WASM binaries are gzip+Base64 embedded in **one HTML**; `connect-src blob:` allows no external HTTP(S).
- Chrome Windows GitHub Actions is the test environment. Android/iOS real-device performance is **not verified**.

## Build size: measured bytes

| Build | Bytes | Note |
|---|---:|---|
| MediaPipe Passage Counter v0.3.0 | **13,505,896** | Real app UI and tracking included, PowerShell template builder |
| LiteRT.js experiment HTML | **12,342,092** | Isolated model/WASM proof, NOT the full Passage Counter UI |
| Difference | **-1,163,804 (8.62%)** | Indicates possible savings; **not a fair final app-to-app comparison** |

Both embed the exact same model and **both WASM variants**. The experiment additionally includes a small local-image UI, but omits the production settings, tracker and correction UI. Its gzip uses Node zlib at level 9, whereas the main template builder uses .NET compression. A production migration would require a same-builder/same-UI measurement.

**Compressed internal LiteRT assets** in the experiment:
- Model: 3,417,063 B.
- Optimized WASM: 2,851,744 B; optimized loader: 66,425 B.
- Compatibility WASM: 2,838,807 B; compatibility loader: 66,484 B.
- JS module including wasm-utils: 8,399 B.
- These are **stored gzip sizes**, BEFORE Base64 overhead; the HTML size above is the generated file.

## Tests (CI run 38091208751: passed)

| Check | Optimized WASM | Compatibility WASM |
|---|---|---|
| Official model SHA-256 | Pass | Pass |
| WebAssembly loader initialization | Pass | Pass |
| Compile unchanged model | Pass | Pass |
| Model inference: input 320×320×3 | Pass | Pass |
| Output two raw tensors | Pass | Pass |
| Standalone HTML on HTTP localhost | Pass | Pass |
| Open HTML directly as `file://` | Pass | Pass |
| External HTTP(S) runtime requests | **0** | **0** |

Additional test: an on-page generated PNG is selected through the local image input in the optimized WASM path and its raw class signals are read, without uploading the image.

### Output interface (observed, not inferred)

- One input: `images`, `uint8 [1,320,320,3]`.
- Output `output_1`: `float32 [1,19206,90]` raw class scores.
- Output `output_0`: `float32 [1,19206,4]` raw box offsets.

MediaPipe's higher-level ObjectDetector returns boxes/class labels/scores. LiteRT provides the model's raw tensors only. A correct app migration needs **anchor generation, SSD bounding-box decoding, score handling, NMS, label mapping, and image aspect transform** compatible with this exact model. Simply selecting a class channel or reading the raw box values would produce wrong people counts.

### Performance note

A previous same-branch green run (38090851016) measured optimized inference with a neutral image in **103.1 / 86.6 / 69.1 ms** for three runs; compatibility in **107.3 / 78.5 / 70.4 ms**. This is Windows Chrome CPU inference only, with neither a mobile power benchmark nor end-to-end person detection and tracking. Do **not** compare it directly against the current MediaPipe detection fps.

### Limitations and adoption decision

- **Supported:** Same TFLite model runs on LiteRT.js CPU/WASM and the experimental 1-file artifact is smaller, with no external HTTP requests.
- **Not established:** Correct bounding-box positions, classification, person precision/recall, crossing accuracy, sustained fps, peak memory, or iOS/Android compatibility.
- LiteRT emits WebGPU/NPU initialization diagnostics (including "no GPU adapter") on the CI host even when the requested inference accelerator is `wasm`. CPU execution still passed; startup/noise should be reviewed before user-facing use.
- The LiteRT experiment's minimal HTML uses a dedicated CI builder; a production adoption must use the normal `htmlapps-template` dependency lock, README, and self-extract validation.

**Decision:** retain MediaPipe for Passage Counter v0.3.0. The LiteRT.js branch remains a viable experimental path, but not yet a safe replacement for the person detector. Next technical gate is a side-by-side detector test using the same local images with accurate postprocessing and matching bounding boxes/labels.

## Reproduction and artifacts

The branch workflow `.github/workflows/litert-experiment.yml`:
1. Builds the current MediaPipe baseline with the template.
2. Installs exact pinned CI-only LiteRT.js dependencies.
3. Builds `dist/litert-trial.html` and SHA/size report.
4. Runs Chrome on hosted and `file://` copies with optimized and compatibility WASM.
5. Uploads the trial HTML, size JSON, browser result JSON, baseline size JSON as a CI artifact.

Do not merge the experiment into the working app or publish it as a production detector without the missing postprocessing and parity tests.
