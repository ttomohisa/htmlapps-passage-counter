Passage Counter — Development entry point
=========================================

This repository implements Browser Kitty's Passage Counter, not the starter sample.

- Japanese usage and build: README.ja.md
- English usage and build: README.md
- Binding implementation requirements: APP_SPEC.md
- v0.1.0–v1.0.0 roadmap: DEVELOPMENT_PLAN.md
- Complete local-only HTML and CSP gate: VERIFY_OFFLINE.md
- WASM bundling background: docs/ADR-001-EMBEDDED-MEDIAPIPE.md
- Experimental SIMD-only policy: docs/ADR-002-SIMD-ONLY.md
- v0.4.0 IndexedDB schema, interval recovery and CSV exports: docs/ADR-003-LOCAL-PERSISTENCE.md

Canonical editable source: src/index.template.html
Build using: scripts/check-powershell-syntax.ps1, then scripts/check-repository.ps1
Generated artifacts: passage-counter.html, dist/index.html, dist/index.self-extract.html
Do not edit generated HTML files manually.

The AI model, WASM loader, SIMD WASM binary, and code must be
present in the one-file HTML. The non-SIMD variant is intentionally omitted here.
