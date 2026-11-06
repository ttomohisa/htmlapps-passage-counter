# Passage Counter UX review correction

Apply the user's screenshot review to PR #17, keeping v1.1.0 and the existing functional scope.

- Remove redundant canvas direction-name keys. Keep only physical A/B side markers; named direction counts remain outside the image.
- Hide the local-processing badge at the existing phone layout breakpoint (820px), retaining the privacy explanation in Help.
- Replace developer diagnostics with numeric fps. Preserve plain-language slow/interruption warnings and internal pacing logic.
- Group phone counts, elapsed time and correction controls directly before the preview. Keep one real DOM instance, moving it back into the right-hand console on PC. Bound phone preview height so fixed controls do not conceal it.
- Make the phone dock reflect the current action: setup check/start, pause or resume, finish where applicable, settings/return. Hide unavailable alternatives instead of presenting disabled twins.
- Reduce repeated headings, routine messages and empty-history text. Keep interruption reasons, errors and calibration warnings.
- Keep desktop counts/actions beside the preview; keep settings and exports accessible through the existing focus control. Preserve line editing, correction/Undo, exports, saved data, JA/EN and standalone/CSP behavior.

Verify with real embedded-model synthetic-camera browser tests at desktop and phone widths, existing geometry/touch regressions, both HTML variants, and updated genuine screenshots. Physical-device endurance and field accuracy remain unverified.
