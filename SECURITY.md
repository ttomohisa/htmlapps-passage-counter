# Security and privacy

- Camera frames are processed in memory; no face recognition or identity tracking across sessions.
- Video only: microphone/audio is not requested, and the app does not save or upload frames.
- In v0.3.0, crossing event history (automatic, correction and Undo) lives in memory until the user chooses CSV; unsaved work is lost on reload.
- Camera facing preference, normalized line endpoints, optional direction labels, and detection overlay visibility may be saved in localStorage. No camera image, recording, face, or physical device identifier is persisted.
- The 30-second calibration/test phase stores only temporary counters; its crossings are not entered in the session event log or exported.
- The generated HTML includes model, runtime JavaScript and SIMD/non-SIMD WASM, each pinned by build-time SHA-256 verification.
- CSP permits \`connect-src blob:\` only for the embedded WASM Blob URL; remote hosts are not allowed.
- Build-time package/model downloads do not imply permission for application runtime downloads.
- This tool does not guarantee counting accuracy. Do not rely on it for critical safety or legal decisions.
- Local privacy requirements, camera consent, and adequate notices remain the responsibility of the operator.
