# LiteRT.js trial with the unchanged EfficientDet-Lite0 int8 model

This directory is a controlled runtime experiment. It does not modify the Passage Counter v0.3.0 detector. All package downloads are CI/build-time only; the experiment HTML embeds the model and both LiteRT WASM variants.

The branch-specific workflow builds the current MediaPipe version, installs exactly pinned LiteRT.js 2.5.3 + esbuild and Playwright, creates dist/litert-trial.html, and tries compiling/executing the **unchanged SHA-256 verified model** in Chrome with optimized and compatibility WASM.

The test logs output tensor details and timing, plus compares one-HTML byte sizes. It does not establish person detection accuracy; LiteRT does not include MediaPipe's image preprocessing / detection postprocessing. Any failure must be documented, not bypassed by silently changing the model.

Run the LiteRT trial workflow; its artifact stores the HTML and JSON results. Do not merge or ship experiment assets without a verified decision.
