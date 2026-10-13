# EfficientDet-Lite0 int8 — distribution license provenance update (2026-10-13)

**Outcome:** There is strong, direct upstream-maintainer evidence that the existing **Google MediaPipe EfficientDet-Lite0 int8** model is offered under **Apache License 2.0**, under a general model-licensing policy with the condition "**unless otherwise noted**". The official Object Detector model card names this exact type and links the model; we have found **no separate license exception** for it. The scope and exact evidence are documented below.

This is an evidence-based project distribution assessment, **not legal advice or a warranty**. Before redistributing, preserve the full Apache 2.0 text and required notices and review third-party component obligations. This assessment applies to the **unchanged, hash-verified original** model; the Kaggle model is **not** a byte-equivalent replacement.

## Primary upstream statements

1. **2026 maintainer's general model-license statement:** MediaPipe maintainer schmidt-sebastian, [comment #5997480830 on issue #6355](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830): "Our source and the models (unless otherwise noted) are licensed under Apache2." This is a **general licensing statement about MediaPipe's models**, not merely about SDK source code. Under Apache 2.0's normal terms, redistribution is permitted subject to notices, license delivery and other conditions.
2. **2023 object detection confirmation:** MediaPipe team member kuaashish, [comment #1778649604 on Object Detection issue #4906](https://github.com/google-ai-edge/mediapipe/issues/4906#issuecomment-1778649604): "MediaPipe models are open for commercial use under the Apache License 2.0". This corroborates that object-detection model weights—not only the SDK—are covered by MediaPipe's declared model license.
3. **Precisely identified default official model:** Google's [Object Detection task guide](https://developers.google.com/edge/mediapipe/solutions/vision/object_detector) recommends **EfficientDet-Lite0 (int8), 320×320**, and links the versioned model file. Google's [Raspberry Pi/iOS example](https://developers.googleblog.com/mediapipe-for-raspberry-pi-and-ios/) uses the precise GCS URL embedded by Passage Counter. The reviewed guide includes **no different license exception** for this EfficientDet-Lite0 int8 distribution.

## Binary provenance and the earlier metadata finding

The actual Passage Counter model:
- URL: https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/int8/1/efficientdet_lite0.tflite
- Size: **4,602,795 bytes**
- SHA-256: \`0720bf247bd76e6594ea28fa9c6f7c5242be774818997dbbeffc4da460c723bb\`
- TFLite metadata: \`author=MediaPipe\`, \`license=null\`; Google Cloud Storage HTTP response has no model-license custom header. This is **absence of file-local metadata**, not evidence that the upstream publisher granted no license. The general publisher statement above applies unless an explicit exception is found.

The following **alternative** TensorFlow/Kaggle official downloads were independently verified through their public API:

| Model | Bytes | SHA-256 |
| --- | ---: | --- |
| Current MediaPipe model | 4,602,795 | \`0720bf24…\` |
| Kaggle \`tensorflow/efficientdet/tfLite/lite0-int8/1\` | 4,561,184 | \`33a3b622…\` |
| Kaggle \`tensorflow/efficientdet/tfLite/lite0-detection-metadata/1\` | 4,563,519 | \`2e04c53b…\` |

Kaggle alternatives are **not the same binary**. Comparing large FlatBuffer model buffers revealed only **one identical 256-byte buffer** against each of the two alternative models, from roughly 3.7 MB of comparable payloads; these cannot be described as a repackaging/metadata-only copy of the current MediaPipe model. **The Kaggle models' license must not be borrowed as proof for the existing GCS model; the primary licensing basis is the two MediaPipe maintainers' answers and the recommended model guide.**

### Independent compatibility experiment (not a shipped model switch)

- An ephemeral Windows GitHub Actions runner temporarily replaced the model with the Kaggle \`lite0-detection-metadata/1\` variant, SHA \`2e04c53b…\`, without changing the public application's model or any stored user data.
- Generated standalone HTML and exercised bundled model startup with **Chrome/Edge** synthetic camera and the existing local/offline/CSV integration tests.
- **PASS**: Chrome and Edge model initialization and the existing integration smoke tests; result \`BROWSER_COMPATIBLE\`. Model switch was *not* committed.
- Test is not proof of real-person detection accuracy, output parity or automatically inherited Google GCS licensing. It demonstrates a technically feasible alternative route if policy interpretation is disputed.
- Evidence: [GitHub Actions run 38347201387](https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/38347201387), scripts \`research-efficientdet-provenance.mjs\`, \`research-kaggle-model-compatibility.ps1\`; CI artifacts \`efficientdet-model-provenance.json\`, \`kaggle-compatibility-audit.json\`.

## Distribution obligations and unresolved matters

For Apache 2.0 model/SDK:
- Include the Apache 2.0 license text with the redistributed standalone. The build now embeds the **full license text** in the offline Help's collapsible third-party license appendix (both HTML variants).
- Retain applicable copyright notices, attribution/NOTICE if provided, and identify changes if modifying upstream material. The pinned model itself is **unmodified**.
- Preserve a stable public provenance record: Google's official model URL, exact SHA, MediaPipe maintainer comments and the applicable Apache license text.

**Still to verify separately:** The exact \`@mediapipe/tasks-vision@0.10.35\` compiled JavaScript/SIMD WASM package may require additional third-party notices and Eigen/MPL covered-source obligations. MediaPipe maintainer [issue #6306](https://github.com/google-ai-edge/mediapipe/issues/6306) acknowledged older npm packages did not include LICENSE/NOTICE and said future packages would address that; source/build provenance remains discussed in [issue #6355](https://github.com/google-ai-edge/mediapipe/issues/6355#issuecomment-5997480830). The single HTML's copied top-level Apache license does not by itself establish the complete compiled dependency's license and NOTICE compliance. Keep LICENSE-STANDALONE **open** pending separate review.

## License conclusion used for Passage Counter

- \`LICENSE-MODEL\`: **SUPPORTABLE / VERIFIED FROM UPSTREAM MAINTAINER POLICY**, on the express assumption that the reviewed EfficientDet int8 variant is not separately excluded. No exclusion was found on the official recommended model guide. The metadata's null field is not a competing license notice.
- \`LICENSE-STANDALONE\`: **OPEN** for compiled JS/WASM and any further notices.
- Physical 30-minute devices and independent real-person precision/recall remain **Future Work**, not validated.
- This assessment does not authorize a claim of guaranteed detection accuracy, an unreviewed version change, or merging/publishing without the user's action.
