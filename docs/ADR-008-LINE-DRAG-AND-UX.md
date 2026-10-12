# ADR-008 — Camera-first UX and whole-line dragging

Status: v0.10.0 Draft; 2026-10-12. Base: v0.9.0's unmerged stacked PR. This UX milestone is separate from the model's unverified real-world count accuracy and physical-phone endurance.

## Problem observed in v0.9.0

The application exposed too many equally weighted panels before the user had any video input. The first-screen help/status was separated from the actual video, camera setup/test/count controls required searching across different columns, correction/export could visually compete with the primary counting task, and the drawn counting line could only be grabbed at a circular endpoint. Touching an empty portion of the video blocked mobile page scrolling because the entire canvas had touch-action:none.

## UI decisions

- Keep the existing Browser Kitty header, favicon, #16624f accent, responsive Japanese/English interface, quiet panels, no external font/emoji, no remote AI or runtime network access.
- Lead with a visible Start camera button above the video; then make the **30-second non-counted setup check** the obvious next action after the camera/model become ready. When the check completes, emphasize Start counting. If there is no ready camera, do not show a dead Test button; if the input is a file, skip the camera-only check. Keep status and recognition feedback close to the video.
- Place active directional counts and elapsed time **in the first workspace row, right beside the video on desktop; immediately below it on narrow phones**. Move advanced camera settings lower so they cannot push the counter off-screen. No duplicate count values or extra floating overlay are needed for a useful primary display.
- Secondary correction/Undo and the three CSV exports remain visible and grouped separately on desktop, with a sensible vertical order on narrow screens. Do not delete or rename existing data inputs, commands, CSV, IndexedDB and help actions.
- Avoid a fixed mobile bottom bar: no control hides content or keyboard, and there is no duplicated button state.
- Empty, loading, permission failure, paused, interrupted, completed and recovered sessions still use the existing honest status model. An unverified field count is never presented as 100% accurate.
- Source remains a native, accessible camera/local-video select. Do not add custom tabs that bypass the existing source-switch safety or browser/file access controls.

## A/B line interaction contract

The drawn line and direction letters use the existing video-coordinate transform and aspect-ratio containment.

- The user requested no separate centre drag handle. The SVG hit stroke is transparent; **the drawn line itself is dragged**. Visible white end circles remain for resizing/rotation.

| Gesture | Behavior |
|---|---|
| Drag a white endpoint | Change *that endpoint only*; change length or angle |
| Drag any middle part of the A/B line | Translate both endpoints by the same delta, preserving length and angle |
| Drag near image edge | Clamp the two endpoints *together* to the existing allowed 0.03–0.97 normalized range |
| Drag away from the line | Page can scroll vertically on touch screens; nothing changes |
| Arrow keys when counting-line canvas has focus | Move the *whole* line in small increments, Shift for larger increments |
| Camera counting / testing / loading / completed session | Interaction disabled; accidental line movement must not corrupt the measurement |
| Valid line edit after completed setup test | Invalidate the test; require retesting before starting the real camera count |
| Save or reload | Persist the updated normalized line; retain direction labels and all existing event/CSV behavior |
| Change device orientation / window size | Reproject normalized line into actual video-content rectangle, accounting for contain/letterboxing |

### Touch strategy

The canvas remains the visual drawing and keyboard-focus surface but no longer swallows page gestures. A separate transparent SVG has pointer-active shapes *only over the line and endpoint handles*. Only those shapes use touch-action:none. The empty video stage uses touch-action:pan-y for ordinary mobile scrolling.

- Touch line stroke target approximately 48 CSS px wide; white endpoint targets approximately 62 CSS px diameter.
- Hit test: endpoint precedence, then finite line segment. The infinite extension is not draggable.
- Capture the active pointer, store the initial two normalized points and starting cursor, and translate from the original points. Do not recompute the translation from an already shifted line each frame, which would cause cumulative drift.
- Use one common bound translation calculation for mouse, touch, pen and keyboard.
- Save to local storage/IndexedDB only after a completed change, not on every pointermove. No image/frame content is stored.

## Verification and release decision

- Unit tests should cover endpoint priority, middle hit target, finite-line extensions, diagonal/vertical lines, normalization, edge bounds, immutability and keyboard geometry.
- Browser E2E should operate a **real embedded model initialized from the single HTML**, simulate mouse endpoint/middle gestures and a mobile touch gesture, ensure calibration reset, lock the line during live counting, and verify no horizontal overflow or control overlap at 320/360/390/820/1280 widths and both languages.
- Regressions: camera/local video, setup test, correction+Undo, saved/aborted sessions, CSV downloads, file:// readable/self-extract startup, CSP and zero external requests, local-only annotation helper and accuracy evaluator.
- README screenshots for v0.10.0 must come from the actual generated app and show honest 0 crossings when the camera is not started.

This is **not** a completed v1.0.0 release: the 100+ independently annotated physical crossing accuracy target, Android/iPhone 30-minute devices and EfficientDet-specific redistribution grant remain open (see release-gates.v0.10.0.json).

## v0.10.0 post-preview UI review

After the initial draft, the user specifically asked to remove the central drag grip, clarify the setup-test UI, and bring counts higher. The revision removes only the extra centre-grip drawing (keeping line-body dragging), moves the counter console out of the bottom of the preview panel, and uses phase-driven Japanese/English Next step copy. Desktop positions video and counter side by side; mobile puts the primary count card directly after the video and before advanced camera settings, corrections and CSV. The setup check is hidden until camera/detector initialization succeeds, its button is emphasized while the app waits for a trial, and the Start counting button becomes prominent only after the trial is complete (or immediately when a local video is ready). Real accuracy/mobile endurance remain unverified.
