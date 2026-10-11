# ADR-005 — Browser Kitty common header, hero and v0.6.0 performance safety

Date: 2026-10-11
Status: **Implemented in v0.6.0 Draft PR #6, pending physical-device release gates**

## UI references actually inspected

The current **main** branch files of:
- \`ttomohisa/htmlapps-pdf-fill-sign/src/index.template.html\`
- \`ttomohisa/htmlapps-wifi-share/src/index.template.html\`

Both reference applications use an ~66px sticky translucent ivory header (\`#f5f5f2\`), embedded SVG brand mark, localized app title plus small version, secondary one-line subtitle, compact one-click EN/JA language control, 24px-path SVG Help button, and a short hero alongside a shield/check badge for fully local processing.

This implementation uses the same structural concepts and visual tokens:
- \`.app-header / .header-inner / .brand-mark / .brand-copy / .header-actions\`
- \`.language-button\`, localized app name, config-driven version
- \`.page-intro\` with a 21–26px headline, 13px factual explanation and \`.local-badge\`.
- A single embedded SVG is used for the favicon and header image (two matching placeholders).
- The language toggle changes \`html.lang\`, tab title, app/footer names, button accessible names, help label, section content and local processing badge. It remembers the choice locally.
- The badge is justified because the bundled AI and selected camera/video user data are processed on the device and CI checks no runtime outbound HTTP/HTTPS. Opening the hosted HTML still downloads the initial document.
- HTML, CSS, icons and local loader must remain single-file and maintain CSP \`connect-src blob:\`. Browser Kitty website home copy is not modified.

Chrome tests assert header/intro non-overlap, no horizontal scroll and correct bilingual content at **320, 360, 390, 820 and 1280px**. Full-page Japanese/English screenshots at 320px and 1280px are produced as CI artifacts.

## Inference and rendering

The MediaPipe Tasks Vision EfficientDet int8 detector remains **synchronous on the main thread**. It remains SIMD-only, with all model, JavaScript and WASM bytes embedded inside the HTML. No new runtime network dependency is added.

- \`createInferencePacer\` is independently unit-testable. It measures detection duration and detection-start intervals to estimate fps and CPU cost. The interval adjusts to the measured cost between **105 and 225ms**. Because the previous \`detectForVideo\` call completes before another begins, slow inference is never queued.
- Video-file input is deduplicated by media time; it still uses native browser decoding, while model timestamps are monotonically advanced. On severe discontinuity, tracker state resets and the session interrupts rather than pretending that missing frames were observed.
- \`draw()\` runs on a new processed frame, configuration change or resize; there is no full-overlay redraw on each display refresh while processing the same frame. In file mode the requestAnimationFrame loop stops while playback is paused and restarts with the next \`play\` event.
- A fast device can attempt around 9 processed frames per second under the default minimum pacing interval. This is not an fps or person-detection precision guarantee.
- \`#recognitionStatus\` shows localized, nontechnical “Recognizing / Processing is slow / Stopped / Ready” states. Raw \`EfficientDet-Lite0\`, fps, mean inference latency, inference attempts deferred by pacing (not an exact decoded-frame count) and gaps live in a collapsed native details element.
- If measured fps stays ~below 2.8 or inference latency is above 390ms for a sustained 8 seconds, the app interrupts real counting and records missing-coverage time; guessing invisible crossings is unsafe.
- The approximately 5-second transactional IndexedDB checkpoint runs independently of UI redraw. Timed counting labels update at 500ms, while full 5/15/60-minute time buckets redraw at a lower cadence, preventing large event histories from being re-aggregated on every frame. Persisted event ordinals are O(1) rather than cloning all prior event objects each time.
- Once the detector initializes, its decoded model and SIMD WASM byte-cache entries are evicted, and temporary loader Blob URLs are revoked. The compressed embedded copies stay available for a future detector start.

## Lifecycle / interruptions

- A late-resolving Screen Wake Lock request is released if the user has already paused or hidden the page. Unexpected wake-lock release while counting produces a visible warning.
- Hiding a tab immediately interrupts counting and records missing coverage. Returning to the foreground never automatically resumes a session.
- Switching viewport orientation during live counting interrupts so the user can check the fixed physical camera and line placement. Normal resizing redraws the overlay.
- Lost media tracks, failure to infer, changing sources, completing video and pagehide retain their earlier explicit-stop and cleanup paths. Runtime outbound requests remain zero.

## Why no Worker/OffscreenCanvas migration in this Draft

MediaPipe's current browser tasks loader is strongly tied to a video/image source and WASM Blob initialization in this repository. A Worker migration would need independently verified access to frame transfer (\`VideoFrame\`/\`ImageBitmap\`), model initialization in a Worker, fallback on iOS, and the existing local one-file CSP. Offloading cannot be claimed safe solely because Worker or OffscreenCanvas is present. As of v0.6.0 Draft, **no working Worker inference path or matched Worker-vs-main-thread mobile benchmark exists**. Preserve the working main-thread route while investigating it later if field performance justifies the complexity.

## Evidence and remaining acceptance gates

Windows Chrome CI uses actual embedded MediaPipe inference on a fake camera and browser-encoded local WebM, verifies both standalone HTML variants, simulates unsupported-browsers and blocked IndexedDB, runs deterministic tracking/ledger/coverage/pacing tests, bilingual responsive UI geometry and no outbound HTTP.

A **20-second synthetic camera** run recorded about **8.6 detection fps**, mean **87ms inference latency**, and JS heap used roughly **5.30MB at start / 5.51MB after 20s** (single sample). This is **not** a mobile estimate, memory peak or leak proof, video/crossing precision metric, or the formal 30-minute endurance test. Other release gates still require representative Android Chrome/iOS Safari devices, 30-minute uninterrupted use, battery/heat/memory checks, target >=8 detection fps on a midrange phone, and genuine labeled crossing accuracy.

This is a **Draft stacked PR**, not production. User merges manually; never auto-merge.
