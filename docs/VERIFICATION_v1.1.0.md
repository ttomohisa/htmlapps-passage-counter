# v1.1.0 verification

Runtime source verified: `352a2f384aaed263b5d54f383d3708a086fb1ef6`.

- [Main integration](https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/42310143228): passed.
- [Browser regressions](https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/42310143262): passed.
- [Preview build and Help](https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/42310143389): passed.
- [Standalone build](https://github.com/ttomohisa/htmlapps-passage-counter/actions/runs/42310143211): passed.

Coverage includes real embedded model/WASM startup with synthetic camera input on Windows Chrome/Edge; native local WebM decoding; sequential samples, pause/resume and cancellation; correction/Undo and IndexedDB restoration; three individual CSVs, ZIP names/CRC and clipboard fallback; direction/area configuration; Japanese/English, narrow/short layouts, keyboard/touch line controls and Help; both standalone variants via file URLs; no external runtime HTTP requests in tested paths. Deterministic source tests cover the ledger, timeline, tracker, area boundaries, sampling, cancellation, geometry, pacing and accuracy evaluator. ZIP extraction was also checked with Python zipfile.

The independent logic review found method-switch replay and floating-point rejection of exact 5% areas; both are fixed. Visual review separated long direction labels from the line and collapsed loaded-file settings. Result corrections now refresh the saved-session list as well as the ledger. Screenshots come from the main integration artifact above and show an explicitly marked synthetic local video with an actual manual correction.

The screenshot-feedback regressions verify numeric fps without developer details, no duplicated direction keys, the hidden phone privacy badge, phone counts above an unobscured preview, state-dependent dock actions, settings/return, desktop heading visibility after start/resume, calibration invalidation after moving the line, rejection of a too-short line and visible preview-playback errors. Synthetic camera layouts are checked at 320/390/1360px. Actual mobile touch and the existing bilingual Help/standalone tests remain in the integration gate.

Sequential processing uses 100 ms samples, not every frame. Video buckets remain actual analysis wall-clock time. ROI filtering does not crop the model input or establish a speed improvement. These are implementation choices, not measured accuracy claims.

Physical Android/iPhone testing, real-camera endurance and 100+ independently labelled real-person crossings remain unverified. Prior pinned runtime source/NOTICE limitations remain recorded in the existing audit; no new legal clearance is claimed.
