# Passage Counter

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-passage-counter/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-passage-counter/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-16624f)](https://github.com/ttomohisa/htmlapps-passage-counter/actions/workflows/build-standalone.yml)

[日本語版 README](README.ja.md)

Passage Counter is a Browser Kitty tool for counting **person-crossing events in two directions (A→B and B→A)**, using a live fixed camera or a video already on the device. It is delivered as one HTML file and does not require an account, installation or video uploads.

**About the v1.0.0 candidate:** The interface and package metadata use version 1.0.0. However, independent real-footage accuracy testing with 100+ genuine crossings, 30-minute physical phone tests and the exact model-file redistribution terms are still **unverified**. The formal stable-release decision remains **NO-GO**. Successful CI does not prove real-world count accuracy. [v1.0.0 release readiness](docs/RELEASE_READINESS_v1.0.0.md)

## Live demo

### [Open Passage Counter on GitHub Pages](https://ttomohisa.github.io/htmlapps-passage-counter/)

A deployed GitHub Pages version may differ from the v1.0.0 candidate in the development PR. Use that PR's Cloudflare Preview link to inspect the candidate.

Opening the hosted page downloads its HTML. Once loaded, person detection, camera frames and selected videos are processed locally on the device, not uploaded to a server.

![Passage Counter desktop, English](assets/screenshot-en.png)

![Passage Counter mobile, English](assets/screenshot-mobile-en.png)

These are captures of the actual generated app before the camera is opened, showing zero genuine events. [Screenshot provenance](assets/SCREENSHOTS.md)

## Features

- **Two-direction crossing counts** — A→B and B→A totals for passages across a line. They are crossing events, not the number of distinct people.
- **Drag the actual line** — Drag its middle to move the complete line without changing its angle/length. Drag either white endpoint to rotate or resize it; reverse the A/B direction when needed.
- **Live camera or local video** — Count with a fixed camera, or select a browser-decodable file from the device. Neither mode requires an upload.
- **30-second camera setup check** — Verify that crossings are recognized in the expected direction before real measurement. Trial events do not affect totals. Local video does not need this step.
- **Direct correction and Undo** — Use −1/+1 in the corner of each direction tile. Undo the latest manual change beside the total. The event history distinguishes automatic counts from manual adjustments.
- **Three CSV exports** — Events, session summary and 5/15/60-minute time buckets, including missing/paused coverage information.
- **Saved sessions and recovery** — Store session records in browser IndexedDB. Review interrupted sessions without silently restarting the camera or reloading source video.
- **Self-contained, on-device AI** — Bundled EfficientDet-Lite0 int8 detector, MediaPipe runtime and SIMD WASM. No runtime model/CDN download or remote inference API.

## Quick start

### Use the web version

Open [GitHub Pages](https://ttomohisa.github.io/htmlapps-passage-counter/). No account or extension is required. Your browser may ask for camera permission when you select Start camera.

### Use a downloaded HTML

Save **dist/index.html** from a GitHub Actions build artifact, or build it yourself as described below. The generated standalone file embeds all JavaScript, WASM and model data. It can run without a network connection after downloading it.

Whether a camera can be opened directly from a local file depends on browser permissions. Use the HTTPS-hosted version when a browser restricts local-file camera access. Physical iOS/Android performance and long-term stability are not yet validated.

### Build from source

1. Download or clone this repository.
2. In Windows PowerShell, run the commands below from the repository root.
3. On the first build, the scripts download the pinned MediaPipe package and detector model **at build time**, verifying their SHA-256 hashes.
4. Use the generated **dist/index.html** or **dist/index.self-extract.html**.

    ./scripts/check-powershell-syntax.ps1
    ./scripts/check-repository.ps1

Both are self-contained HTML files. The build also creates **passage-counter.html** as a root-level copy of the readable version. Building requires Windows PowerShell and tar.exe; using the finished HTML requires neither.

## How to use

1. **Choose a source.** Fix your camera in position and select Start camera, or select Local video and choose a file from your device.
2. **Position the counting line.** Drag the line itself to translate it; adjust length and angle with the end circles. Reverse A/B if necessary.
3. **Verify the setup (camera mode only).** Run the 30-second check to confirm that detection and direction make sense. Trial events are excluded from the actual count. Moving the line requires another check.
4. **Start counting.** Select Start counting to collect A→B and B→A crossing events. Local-video analysis starts from the beginning and stops at the end of the clip.
5. **Correct mistakes.** Use the tile's −1/+1 controls for missed or extra events, and Undo beside the total for the last manual correction.
6. **Pause, finish and export.** Save Events CSV, Summary CSV and Time buckets CSV when needed.

### Measurement and recovery

- Keep the page visible while counting. A hidden tab, camera interruption or device rotation can interrupt counting. Time that was not observed is recorded as **missing**, not as zero events.
- Existing session records can be reopened from Saved sessions. Videos and persistent person IDs are not saved, so cameras and original video sources never resume automatically after reload.
- Video preview allows seeking. When there is a saved analysis, seeking or reanalyzing asks for confirmation before discarding its counts and corrections. Video file bytes are not persisted to IndexedDB.
- Browser and origin storage are separate: a downloaded file, a hosted Preview and GitHub Pages do not automatically share saved records. Export any data you need to preserve.

### CSV formats

| Export | Contents |
| --- | --- |
| Events CSV | Automatic crossings, manual corrections and Undo, with timestamps, direction and deltas; local video includes source-media timestamps |
| Summary CSV | Automatic, manual and final totals by direction, duration, observed/paused/missing coverage |
| Time buckets CSV | Direction counts for 5/15/60-minute time buckets plus valid observation time and coverage |

CSV uses UTF-8 with BOM. The export filename is configurable. Video files are not included in the CSV files.

### Keyboard

| Shortcut | Action |
| --- | --- |
| Arrow keys when the counting line has focus | Move the whole line a small amount |
| Shift + arrow keys | Move the whole line a larger amount |
| Escape when Help is open | Close Help and restore the previous page scroll position |

The counting line is locked during the setup check and while counting is active.

## Development and GitHub Pages

This repository follows Browser Kitty's [htmlapps-template](https://github.com/ttomohisa/htmlapps-template)-style structure. **src/index.template.html** is the editable source; built HTML is not edited by hand.

    src/index.template.html
    app.config.json
    dependencies.json
    dependencies.lock.json
    model.config.json
    assets/favicon.svg
    assets/screenshot.png
    assets/screenshot-en.png
    assets/screenshot-mobile.png
    assets/screenshot-mobile-en.png
    build-standalone.ps1
    scripts/check-repository.ps1
    scripts/smoke-help-v1.mjs
    dist/index.html                  # generated by build
    dist/index.self-extract.html     # generated by build

The [GitHub Pages workflow](.github/workflows/deploy-pages.yml) is configured to build and publish from main when Pages is enabled. Draft PRs use separate Cloudflare Preview deployments; only the user merges pull requests.

The full requirements, testing and design notes are in [APP_SPEC.md](APP_SPEC.md), the [development plan](DEVELOPMENT_PLAN.md), the [offline verification guide](VERIFY_OFFLINE.md) and the [accuracy evaluation protocol](docs/ADR-007-ACCURACY-EVALUATION.md).

## Privacy and runtime network controls

- Camera frames, person images, audio and local video file contents are not transmitted by the app. It requests video-only camera input, not microphone audio.
- All model inference runs in the browser from the bundled JavaScript/MediaPipe SIMD WASM and detector assets. No remote AI inference service is used.
- Session names, event history, adjustments and coverage are stored in IndexedDB within the same browser; line position and display preferences use localStorage. The original video is not stored.
- CSP limits runtime network access while allowing embedded in-memory assets to be loaded through Blob URLs. The initial hosted HTML download still uses the network.
- Automated tests have found zero unexpected outbound HTTP requests in the paths they exercise. That is not a claim that every browser, physical phone or production hosting header is independently verified.

## Browser requirements and limitations

- **WebAssembly SIMD and compressed-data decompression support are required.** The app explains missing capabilities before trying to open the camera.
- The embedded model is exercised on Windows Chrome and Edge with simulated cameras. Real Windows physical cameras, Android Chrome, iPhone Safari and sustained phone operation require separate validation.
- Local videos use native browser decoders. Selecting a file does not guarantee that the browser can decode its format.
- Crowds, occlusion, backlighting, darkness, quick crossings, poor placement, camera movement and slow inference can introduce missed or incorrect counts.
- A person crossing both directions produces two crossing events. This is **not unique visitor identification**.
- Do not use the counts as the sole evidence for safety-critical monitoring, billing or legal reporting.
- **Stable v1.0.0 approval is pending.** The 100+ independently annotated real crossing sample, 95% direction-wise precision/recall target, 30-minute physical-device tests and exact model redistribution rights remain open. [Review the release gates](docs/RELEASE_READINESS_v1.0.0.md).

## Dependencies and model

| Component | Pinned version/type | Role |
| --- | --- | --- |
| MediaPipe Tasks Vision | 0.10.35, Apache-2.0 | Browser-side person detection and WASM runtime |
| EfficientDet-Lite0 | int8 TFLite, SHA-256 pinned | Person model; **the exact model file's redistribution permission remains unverified** |
| Application source | MIT | Tracking, crossing logic, correction/Undo, CSV and browser UI |

[Third-party notices and model licensing](THIRD_PARTY_NOTICES.md)

## Contributing

Report bugs or propose changes through [GitHub Issues](https://github.com/ttomohisa/htmlapps-passage-counter/issues). See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Copyright © 2026 ttomohisa

The application source is under the [MIT License](LICENSE). Dependencies and the model require their own license/redistribution review.
