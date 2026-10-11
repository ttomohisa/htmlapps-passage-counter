# Security and privacy

- Both camera and selected video frames are processed in memory; no face recognition or identity tracking across sessions.
- v0.6.0 evicts decoded model/WASM byte caches and revokes MediaPipe initialization Blob URLs after successful detector startup; the compressed model/WASM remain entirely inside the HTML and can be reinflated if a new detector is created. Camera/media Blob URLs are still revoked on close/pagehide.
- Synchronous SIMD inference uses one latest frame at a time with an adaptive interval; very-low-fps sustained operation interrupts rather than claiming reliable counts. Coverage stores observed, paused and missing time.
- Screen Wake Lock can resolve after a session was paused; an obsolete lock is immediately released. Unexpected wake-lock release triggers a visible warning. Rotating while counting interrupts until explicit restart.
- The v0.5.0 video mode uses a Blob URL for the user-selected File and browser-native on-demand video decoding. No whole-file FileReader/arrayBuffer, video content upload, movie storage or remote decoding service is used. The Blob URL is revoked when switching/closing sources or on page exit.
- Video sessions persist only sourceType=`file`, numerical duration, timed passage/correction/Undo events and existing coverage metadata. Video file name, bytes, temporary Blob URL, image pixels and person IDs are not saved. Saved results can be reviewed after reloading without the source movie; no automatic video or camera restart.
- Explicit seek/reanalysis confirmation removes the prior indexed session and events to prevent double counting; a browser-initiated seek during counting interrupts rather than guessing crossings.
- Video only: microphone/audio is not requested, and the app does not save or upload frames.
- In v0.4.0, indexed on-device IndexedDB stores versioned session metadata, directional event/adjustment/Undo records, the camera line geometry and observed/paused/missing intervals. It stores **no frames, photos, audio, faces, stable person IDs or camera device identifiers**. MediaPipe models/WASM are embedded and never fetched at runtime.
- New events and their session snapshots are committed transactionally; checkpoints happen around every five seconds while counting. A sudden crash may lose not-yet-committed events. Recovery always starts stopped, marking unobserved time as missing.
- If IndexedDB cannot open or a write fails, the UI explicitly warns; users may export in-memory events/summaries/intervals as CSV. Browser storage clearing or multiple-tab conflicts can still cause loss.
- Camera facing preference, normalized line endpoints, optional direction labels, and detection overlay visibility may be saved in localStorage. No camera image, recording, face, or physical device identifier is persisted.
- The 30-second calibration/test phase stores only temporary counters; its crossings are not entered in the session event log or exported.
- The generated experimental HTML includes the model, JS, and SIMD WASM with its loader (without the non-SIMD fallback); checksums are pinned at build time. Unsupported browsers cannot request camera permission.
- CSP permits \`connect-src blob:\` only for the embedded WASM Blob URL; remote hosts are not allowed.
- Build-time package/model downloads do not imply permission for application runtime downloads.
- This tool does not guarantee counting accuracy. Do not rely on it for critical safety or legal decisions.
- Local privacy requirements, camera consent, and adequate notices remain the responsibility of the operator.
