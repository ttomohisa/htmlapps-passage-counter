# Passage improvements Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.

**Goal:** Deliver all eight approved improvements without changing privacy boundaries.
**Architecture:** Extend the current single source HTML and its explicit state. Share pure sampling/area/ZIP helpers between runtime and deterministic tests.
**Tech Stack:** Native JS/CSS/SVG, existing MediaPipe and PowerShell build.
**Spec:** docs/superpowers/specs/2026-11-07-passage-improvements-design.md

## Global Constraints
- Brand #16624F, JA/EN, minimum 44px controls, reduced motion.
- No new runtime dependency or network source; retain both standalone builds.
- Preserve event ledger and wall-clock coverage semantics.

## Review Focus
- Pause, replacement or hiding during a sequential seek must invalidate pending inference.
- Last video sample must finish exactly once; resume preserves earlier events.
- Saved sessions restore area/direction configuration but never media or transient crossing coordinates.
- Narrow/short phones retain access to controls and help.
- Exported ZIP filenames, CRC and CSV formula escaping remain valid.

### Task 1: Pure operations and deterministic tests
Files: src/index.template.html, scripts/test-operations.mjs.
- [x] Test missing area validation, line presets, monotonic 100ms sample positions, ZIP bytes and CRC; observe RED.
- [x] Implement helpers in OPERATIONS markers; run deterministic suite, expect PASS.

### Task 2: Integrate measurement, calibration and sampled video
Files: src/index.template.html, scripts/smoke-improvements.mjs.
- [x] Add browser regressions for local sequential video, pause/resume, source replacement, configuration freeze and exports; execute in CI because local browser launch is restricted.
- [x] Add controls/translations, generation-guarded seek loop, feedback and area filtering, focus bar, timeline and summary.
- [x] Build both HTMLs; run new and existing browser regressions and layout checks; expect PASS.

### Task 3: Documentation and review
Files: app.config.json, README.md, README.ja.md, APP_SPEC.md, CHANGELOG.md, assets/screenshot*.png, CI.
- [x] Document real behavior and unchanged field-test limits; set 1.1.0.
- [x] PowerShell preflight and repository build, deterministic and browser suites, no-network/file variants.
- [x] Review final diff, fix material findings, commit and open PR; do not merge.
