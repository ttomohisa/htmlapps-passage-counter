# Passage Counter v1.1 design

Implement the eight improvements approved by the user's “実装して” following the proposal: focused measuring UI, crossing feedback, informative calibration, sequential local video analysis, line presets and labels, optional counting area, directional timeline, combined export and copyable summary.

Keep single HTML, embedded pinned assets, existing correction/Undo and coverage semantics, JA/EN, no external runtime requests. Do not claim field accuracy or physical phone testing.

Approaches: retain live latest-frame processing for cameras; add sequential 100 ms sampled seeks for video as the default alongside the existing playback mode. It costs processing time but avoids playback outrunning inference; it is not every-frame analysis or an accuracy guarantee. Timeline remains wall-clock analysis time and says so explicitly.

Area uses an optional normalized rectangle with accessible percentage fields and a visible outline; foot points outside it do not enter tracking. Configuration is frozen while testing/counting and recorded per segment. No images or person identifiers persist.

Focus mode hides peripheral panels while counting; explicit toggle restores them. Phone action bar uses actual disabled states and safe-area padding. Transient crossing coordinates remain in memory only. Calibration reports actual samples and counts, not confidence or accuracy.

ZIP uses a small native uncompressed ZIP writer for the existing three CSVs; no new dependency. Copy failure exposes selectable text. Existing individual exports remain available.
