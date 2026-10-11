# ADR-007 — v0.8.0 real-world people-crossing accuracy evaluation

Date: 2026-10-11
Status: **Evaluation tooling implemented; independent real-footage evidence is NOT yet available. No-Go for numerical accuracy claim.**

## Intent and product boundary

Passage Counter counts **person crossing EVENTS** of a user-positioned finite line, not unique individuals or exact occupancy. The live camera, local-video decoder, EfficientDet person detector and short-term tracker must remain browser-local and unchanged as a matter of privacy. No face identification, recording, remote AI calls or persistent track IDs.

The v0.8 baseline is the existing `prediction-iou-v0.2` tracker; **do not tune thresholds against fabricated data and then claim production precision**. Actual tuning follows separate calibration footage and independent holdout footage. v0.8 does not declare a field-accuracy win without independent evaluation.

## Evidence requirement (APP_SPEC AC-04 and DEVELOPMENT_PLAN)

- At least **100 human-annotated real crossing events in a previously untouched, fixed-camera, standard-condition holdout**, both A→B and B→A directions represented.
- Standard condition: adequate light; fixed camera; feet or near-full body in frame; relatively little person overlap. Evaluate difficult conditions **separately**: partial occlusion, two simultaneously crossing, return/jitter at line, glare, dim lighting, sudden movement, camera shake, detector delay.
- Event definition: crossing the **configured finite LINE SEGMENT** with a stable transition from one side to the opposite side. A person appearing on a line or passing only its extension is not a ground-truth event.
- Reviewer records each exact crossing time and direction. For the video input path, use `source_time_ms` relative to the source video's playback timeline (not analysis wall time). For live camera recordings, use ISO `occurred_at` with timezone; preserve device timebase.
- The evaluator matches only **automatic** entries. The app's manual correction and Undo remain important operational controls, but including them in algorithm scores would artificially inflate precision.
- Each prediction can match at most one ground-truth event of the **same direction** within **±1,500 ms**. Matching first maximizes TP, then minimizes total absolute time difference; one-to-one matching prevents duplicate predictions from claiming multiple correct events.
- `TP` = matching automatic crossing; `FP` = unmatched automatic crossing; `FN` = missed human-labeled crossing. Precision = TP/(TP+FP); Recall = TP/(TP+FN); zero denominators produce **N/A**, not 100%.
- Record combined and each direction's Precision and Recall. The release target is **at least 95% for both measures in the standard condition** (plus breakdown by direction), not a universal guarantee in difficult conditions.
- A reviewer must separately inspect false positives and false negatives. The diagnostics `possible_direction_mismatch` and `possible_duplicate_or_missed_match` are **timestamp-based hypotheses**, not confirmed root causes.

## Use the offline evaluator

Run the actual Passage Counter on a consented/freely licensed fixed-camera video; set the line first, start counting, run to the end, save its **Events CSV**. Human reviewers independently annotate the same source video: e.g.

```csv
event_id,direction,source_time_ms,subject_id
human-001,A_TO_B,2340,anonymous-1
human-002,B_TO_A,5080,anonymous-2
```

The `subject_id` is an optional local short-lived annotation aid, never a person identifier in the app. Do not publish the subject labels or original videos without consent/legal review.

Prepare a **local manifest** (example: `examples/accuracy/synthetic-manifest.json`), with fields:

```json
{
  "schemaVersion": 1,
  "evaluationId": "field-holdout-01",
  "algorithmVersion": "prediction-iou-v0.2",
  "modelVersion": "EfficientDet-Lite0-int8-1",
  "toleranceMs": 1500,
  "scenes": [{
    "id": "doorway-holdout-01",
    "condition": "standard",
    "split": "holdout",
    "provenance": "real_video",
    "timeBasis": "media",
    "groundTruthCsv": "holdout-human-events.csv",
    "predictedCsv": "holdout-app-events.csv",
    "device": "record device/OS",
    "browser": "record browser/version",
    "inferenceFps": null,
    "videoSha256": "record original clip SHA-256 if available",
    "notes": "fixed, lit doorway; include full setup notes"
  }]
}
```

Use source paths relative to the manifest. `calibration` and `holdout` are separate splits; do not reuse holdout scenes to tune parameters or select a favorable line. Add difficult scenes with `condition: "difficult"`; they are reported but **not included in the standard-condition 95% gate**.

Commands:

```sh
node scripts/test-accuracy-evaluator.mjs
node scripts/evaluate-accuracy.mjs examples/accuracy/synthetic-manifest.json --json=dist/accuracy-example.json --md=dist/accuracy-example.md
node scripts/evaluate-accuracy.mjs path/to/local-manifest.json --json=dist/accuracy-field.json --md=dist/accuracy-field.md
```

Both commands stay on the computer; they read **CSV only**, never upload or require the video. With `--require-review-candidate`, an incomplete/failed holdout returns exit code 2; successful candidate means **human evidence review is still needed**, not a production approval.

## Scoring and QA policy

The evaluator is deterministic and has tests for CSV BOM/quoting, clock timezones, manual-vs-auto filtering, direction inversions, duplicate predictions, missing entries, ±1.5s boundaries, globally optimal matching, and fake/synthetic attempts at an accuracy claim. The example fixture has **3 explicitly synthetic events**; it validates the score pipeline only and must never be counted among the required real 100.

The report includes each scene's counts, standard vs difficult and calibration vs holdout, direction-specific metrics, and a gate status. A manifest `provenance: "real_video"` is a declaration by its author, **not verifiable authenticity**; human review must confirm video origin, camera setup, stable frame-rate, independent labels and license. The tool does not check that model inference truly occurred; pair it with the app's E2E and network audit.

### Field case log

| Case | Required evidence |
|---|---|
| Fixed entry, adequately lit | 100+ independent holdout events, both directions |
| Opposite simultaneous crossings | count false matches and ID-swaps manually |
| Stop before / jitter at line | no phantom event |
| Walk across finite-line extension | no event |
| Short occlusion | track re-association or explicitly missed events |
| Fast walking, sudden reverse | count and direction check |
| Tripod shake / camera relocation | manual interruption, separate difficult data |
| Low light / backlight | model miss rate separately, no standard-condition 95% claim |
| Android Chrome, iOS Safari | physical device fps, thermal, battery, 30 min (see ADR-006) |

If the standard holdout fails the 95% target, tune **calibration** scenes only, repeat with untouched holdout, or narrow the claimed acceptable installation conditions with recorded evidence. Do not delete difficult data, silently tune against the holdout, or merge v0.8 as a validated 95% release.

## Data and license hygiene

Do **not** commit customer/visitor videos, frames, personal identifiers or production CSVs to a public repository by default. Keep evaluation data on an authorized machine; commit only the code, synthetic fixtures, instructions and suitably anonymized metrics. For potential external research datasets, verify both footage and annotation licenses, and whether video viewpoint matches a **fixed camera plus user-positioned line** before counting them toward the field acceptance target. Many road-crossing and surveillance datasets do not directly label the Passage Counter line-crossing event.

## Explicit open blockers

- No verified ≥100 independently labeled real standard-condition crossings provided for this PR.
- Android Chrome / iPhone Safari physical test, long-duration (30 min) operation and heat/memory/fps remain open from v0.7.
- In particular, passing synthetic tracking traces and the sample scoring manifest **do not prove** 95% precision/recall on actual visitors.
