# Security and privacy

- Camera frames are processed in memory; no face recognition or identity tracking across sessions.
- Video only: microphone/audio is not requested, and the app does not save or upload frames.
- In v0.1.0, crossing events live in memory until the user chooses CSV; unsaved work is lost on reload.
- The generated HTML includes model, runtime JavaScript and SIMD/non-SIMD WASM, each pinned by build-time SHA-256 verification.
- CSP permits \`connect-src blob:\` only for the embedded WASM Blob URL; remote hosts are not allowed.
- Build-time package/model downloads do not imply permission for application runtime downloads.
- This tool does not guarantee counting accuracy. Do not rely on it for critical safety or legal decisions.
- Local privacy requirements, camera consent, and adequate notices remain the responsibility of the operator.
