# Passage Counter — Future Work (2026-10-13 scope decision)

**Owner direction (2026-10-13):** Physical-device testing and the real-world pedestrian crossing accuracy study are **Future Work**. They are NOT counted as passed or completed. They are not required for the limited technical/experimental v1.0.0 release scope currently being considered.

This intentionally supersedes the previous v1.0.0 hardware and precision/recall hard-gate timing in APP_SPEC.md and DEVELOPMENT_PLAN.md. It **does not** remove the requirement to disclose unknown accuracy and compatibility in both Japanese and English product documentation.

## FW-01: Real-camera and mobile-device validation

- Test real Windows Chrome/Edge cameras, a representative midrange Android Chrome device and iPhone Safari.
- Verify camera permission, device rotation, switching to background, sleep/Wake Lock behavior, responsive UI, line dragging, reversal, camera-only 30-second setup check, correction/Undo, IndexedDB save/recover, and all three CSV exports.
- For live input, run **30 minutes** uninterrupted on representative phones. Log inference fps, latency, battery drain, thermal throttling and whole-process memory (not only JS heap).
- Distinguish standalone file:// from HTTPS. Screen-off/background counting is not supported and should not be represented as if it is.

Status: **UNVERIFIED / NOT EXECUTED**. Windows simulated-camera CI is available but is not physical-device proof.

## FW-02: Independent crossing-event precision/recall

- Use appropriate, consented fixed-camera real footage, under standard and difficult conditions, with human-labelled events.
- Independently label **100+** standard-condition crossing events in both A→B and B→A directions. Separate threshold-tuning/calibration scenes from the untouched holdout corpus.
- Score direction-sensitive one-to-one precision and recall within the defined timestamp tolerance (ADR-007). Report true positives/false positives/false negatives, per-direction statistics, and error causes. **95% per-direction precision and recall is a goal, not a measured achievement.**
- Do not use synthetic fixtures or manual corrections/Undo to inflate the score. Do not commit identifiable recordings to a public repository without consent/rights and explicit review.
- Evaluate lighting, occlusion, overlapping people, camera motion, fast passers-by, and tracker frame gaps.

Status: **UNVERIFIED / NOT EXECUTED**. Existing synthetic regression tests validate software contracts, not actual people-counting accuracy.

## Still relevant to release now (NOT Future Work)

- Confirm a legitimate **redistribution grant for the exact EfficientDet-Lite0 (int8) binary**, not only for the MediaPipe SDK code.
- Review the standalone HTML's embedded Apache-2.0 text and any additional npm/compiled-WASM notices, model terms, and attribution requirements.
- Verify current hosted CSP behavior on real served HTTP HTML, including the interaction of response CSP headers, inline meta CSP, Blob/WASM loading and cold model initialization.
- Preserve no unnecessary runtime network access, no personal video upload, correct offline build/CSV and honest error states.

Tracked in [v1.0.0 release gates](release-gates.v1.0.0.json), [release readiness](RELEASE_READINESS_v1.0.0.md) and [licensing/CSP evidence](LICENSING_CSP_AUDIT_2026-10-13.md).

**Decision:** Postponing FW-01/FW-02 is a scope adjustment, not retroactive evidence of accuracy, mobile compatibility or complete release readiness.
