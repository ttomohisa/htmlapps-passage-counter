# Passage Counter — Model redistribution and deployed CSP audit

Date: **2026-10-13**
Scope: the SHA-pinned EfficientDet-Lite0 int8 model and the *actually served* Cloudflare PR #10 Preview / public GitHub Pages HTTP responses. This is a technical evidence review, **not a lawyer's opinion**.

## October 13 update — direct upstream model licensing evidence

**This finding supersedes the earlier "model license unverified" conclusion below.** A MediaPipe maintainer has explicitly stated that "Our source and the models (unless otherwise noted) are licensed under Apache2" ([original upstream comment](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830)). A separate [MediaPipe object-detection team answer](https://github.com/google-ai-edge/mediapipe/issues/4906#issuecomment-1778649604) confirms Apache 2.0 commercial use for MediaPipe models. The official [EfficientDet-Lite0 int8 model guide](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector) links the exact recommended model and does not mark an exception.

**Updated judgment:** Apache 2.0 is supported for the current hash-verified MediaPipe EfficientDet-Lite0 int8 under that upstream default, **unless an undiscovered model-specific exception applies**. A null license field in the binary is not a contrary license notice. The general model policy, rather than the different Kaggle model's license, is the authoritative basis. The original model has not been changed.

**Important remaining work:** the exact compiled JavaScript/WASM package's third-party NOTICE or covered-source obligations still require review. This is a separate question from whether MediaPipe's model is Apache-2.0 licensed. Physical camera/device and real crossing accuracy tests remain Future Work. See [full hash/provenance comparison](EFFICIENTDET_MODEL_LICENSE_2026-10-13.md) and [Apache 2.0 redistribution conditions](https://www.apache.org/licenses/LICENSE-2.0).

The following older sections show the original forensic results **before the maintainer's general grant was located**. Interpret their older "UNVERIFIED" conclusion as historical, not current.

## Summary

| Issue | Result |
| --- | --- |
| Google model download and integrity | **Verified**: exact official URL, 4,602,795 bytes, pinned SHA-256 |
| License for the *separate model binary* | **Apache-2.0 supported by MediaPipe maintainer's default** (unless otherwise noted). Binary-local metadata is blank; official guide notes no exception |
| MediaPipe runtime code license | **Apache-2.0** at upstream; full Apache license text is now embedded visibly in the single HTML Help (build-time) |
| All bundled JS/WASM/third-party NOTICE obligations | **Open review**: evaluate pinned compiled package for additional required attribution/NOTICE |
| Cloudflare PR #10 live CSP | **Verified**: HTTP 200 (v1.0.0), enforcing HTML meta CSP; no HTTP CSP header; genuine Chrome bundled-model startup succeeded with 0 violations, 0 JS errors, 0 external HTTP requests |
| GitHub Pages CSP | **Observed**: HTTP 200, served version v1.1.0 (different from the PR's v1.0.0); HTML meta CSP present, HTTP CSP header absent. These findings must not be represented as deployment of the v1.0.0 PR to main |
| Real devices and live crossing precision/recall | **Future Work**, deliberately not tested or claimed passed |

## Model: precise source and evidence

The pinned model is **EfficientDet-Lite0, int8, version 1**:

- URL: https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite
- SHA-256: 0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb
- Size: **4,602,795 bytes** (exact hash verified in GitHub Actions on 2026-10-13).
- Binary format: **TFL3**, containing a TFLite `TFLITE_METADATA` buffer. Its ModelMetadata fields read: `name=ObjectDetector`, `version=1`, `author=MediaPipe`, `license=null`.
- GCS response: no `x-goog-meta-license`, `x-goog-meta-licence`, `x-goog-meta-attribution`, or `x-goog-meta-copyright` headers were returned.
- Build config `model.config.json` used to *assert* `Apache-2.0`. It is now changed to `UNVERIFIED`, because a locally written license string cannot authorize redistribution.
- Reproducible technical audit: `node scripts/audit-model-license.mjs`. Evidence: [GitHub Actions run 38339053721](https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/38339053721); CI uploads `dist/model-license-audit.json`.

**Evidence from Google:** [MediaPipe Object Detection task documentation](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector) names the model as a recommended downloadable option; Google's [MediaPipe for Raspberry Pi and iOS article](https://developers.googleblog.com/mediapipe-for-raspberry-pi-and-ios/) uses the **exact same int8 object URL** in its example command. This supports official **download and use**. Neither page, as reviewed, explicitly grants the independent right to **re-embed/re-distribute the hosted TFLite bytes as part of a third-party single HTML**.

**Separate software license:** The [google-ai-edge/mediapipe](https://github.com/google-ai-edge/mediapipe) code repo has an [Apache License, Version 2.0](https://github.com/google-ai-edge/mediapipe/blob/master/LICENSE). The `@mediapipe/tasks-vision@0.10.35` dependency declares `Apache-2.0`. That grant covers MediaPipe runtime *code* under its terms, but cannot automatically be extended to the separately hosted model artifact without evidence.

**Conclusion:** **NO explicit model-binary redistribution permission was established for this SHA-pinned int8 artifact**. This does not prove redistribution is forbidden; it means we cannot sign it off from available authoritative evidence. To close this gate, obtain official model-specific terms/permission from Google/the rightsholder, or change to a correctly licensed and technically suitable alternative with a verified exact artifact. Do not quietly replace the model or downgrade license requirements.

## October 13 exact npm/WASM third-party notice investigation

The SHA-locked `@mediapipe/tasks-vision@0.10.35` npm archive (SHA `84597a25e13d123b5f4cbe768bb72e97a2c28c7a465f0ace287d8cbe5246bff0`) was fetched and inventoried. It contains **13 files without LICENSE or NOTICE**, even though package metadata declares Apache 2.0. The SIMD WASM that is actually bundled hashes to `6a5c64584c2ab61c763b6e204afbdbc7ce1caf7f5216187322bca8df94f646bc`, whereas `v0.10.35/third_party/wasm_files.bzl` references a different WASM hash `e17fc0c480b79a16ad1756bb81ebd9a6c117b1ec4cad6084c6d6a417a6f426b7`. This prevents confidently matching the npm executable to an exact source revision.

The upstream `v0.10.35` source pins Eigen at revision `4c38131a16803130b66266a912029504f2cf23cd` with **MPL 2.0 and BSD-style** licenses. We conservatively included the full MPL-2.0 and related Eigen BSD/MINPACK material, plus the application's MIT license, in the self-contained Help alongside Apache 2.0. The original running MediaPipe model remains unchanged. The exact compiled-WASM corresponding-source and transitive notice mapping is still under review, particularly [MPL 2.0 §3.2](https://www.mozilla.org/en-US/MPL/2.0/). See [detailed audit](MEDIAPIPE_RUNTIME_LICENSE_2026-10-13.md) and [limited-release handoff](RELEASE_HANDOFF_v1.0.0.md). This is **not** presented as a confirmed violation, only an unclosed evidence gap.

## MediaPipe notices in the offline HTML

The standalone distribution must work even when someone downloads **only** the single HTML. The repository's `licenses/Apache-2.0.txt` is not automatically included in that download.

This audit adds:
- An expandable **Third-party license (MediaPipe)** section in the Help dialog, with the complete license text embedded at **build time** into both the readable and self-extract HTML.
- A build failure if the local Apache-2.0 text is missing or incomplete; HTML-escaped insertion prevents the text from breaking the single-file source.
- A release-audit assertion that the resulting HTML contains the real full text and does not pretend the model's separate grant has been verified.

This helps fulfill the runtime Apache license notice requirement. It is **not yet** an independent audit of the compiled npm/WASM package's possible additional `NOTICE`/attribution material; this remains an explicit licensing blocker rather than being incorrectly marked green.

Related: [MediaPipe APIs Terms of Service](https://developers.google.com/edge/mediapipe/legal/tos), updated 2026, discuss SDK usage telemetry/metrics. In exercised Passage Counter browser paths, outgoing HTTP remains blocked and no telemetry requests were observed. Legal interpretation of those terms for this particular offline-bundled runtime remains separate from technical network verification.

## Cloudflare Preview: real HTTP/CSP behavior

Audited endpoint: https://r1413462956-pr-10-bk-previews.ttomohisa.workers.dev/

- Response: **HTTP 200**, correct v1.0.0 HTML.
- Response `Content-Security-Policy` header: **absent** (not an automatic failure).
- An enforcing HTML `meta http-equiv="Content-Security-Policy"` is present, containing:
  - `connect-src blob:` — no network origins permitted for `fetch`/XHR.
  - `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:` — allows bundled code/WASM as currently implemented.
  - `worker-src 'self' blob:`, `media-src 'self' blob:`, `object-src 'none'`, `frame-src 'none'`.
- Actual Windows Chrome from the GitHub Actions runner loaded the served Cloudflare HTML, accepted a simulated video-only camera, initialized the embedded MediaPipe/WASM/object detector to **ready**, and reported **zero** CSP policy violations, uncaught JS errors and outbound HTTP requests.
- Technical evidence: [GitHub Actions run 38339053721](https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/38339053721), `node scripts/audit-hosted-csp.mjs`; output `dist/host-csp-audit.json`.

**Interpretation:** The absence of an HTTP CSP header is compatible with an **enforcing meta CSP**. A future host-level CSP header, if added, applies *in addition to* the meta policy and must be tested for Blob/WASM and media compatibility. This check does not imply the app is already published on Browser Kitty's main production website.

## GitHub Pages: actual deployed response

Endpoint: https://ttomohisa.github.io/htmlapps-passage-counter/

At the time of the audit, the server returned **HTTP 200**, with **no HTTP CSP header**, and **an HTML meta CSP**. The raw served HTML included a v1.1.0 version badge; after the page's JavaScript ran, browser automation observed a v1.3.0 badge. The public deployment is therefore **not the v1.0.0 build** being audited; its browser-based model-startup path was not executed by this v1.0.0-specific test. We do not infer its runtime CSP compatibility from the v1.0.0 Preview result. The difference between raw and runtime labels is recorded as an observation rather than silently reconciled.

## Release policy and Future Work

The owner explicitly deferred real-device tests and the 100+ independently labelled passage precision/recall study to [Future Work](FUTURE_WORK.md) on 2026-10-13. Those items remain marked **unverified**, never passed, and the app documentation must not imply proven accuracy, reliable background counting or universal mobile browser support.

Blocking now: exact model redistribution grant and any remaining standalone compiled-WASM/package NOTICE obligations. Preview CSP: checked and passing in the tested branch. Before publication on a **different production host**, repeat the live HTTP+browser CSP check against that new URL.

The repository's [machine-readable release gates](release-gates.v1.0.0.json) and [decision document](RELEASE_READINESS_v1.0.0.md) track these separately.
