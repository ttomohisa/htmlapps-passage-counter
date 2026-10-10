Passage Counter — Development entry point
=========================================

This repository implements Browser Kitty's Passage Counter, not the starter sample.

- Japanese usage and build: README.ja.md
- English usage and build: README.md
- Binding implementation requirements: APP_SPEC.md
- v0.1.0–v1.0.0 roadmap: DEVELOPMENT_PLAN.md
- Complete local-only HTML and CSP gate: VERIFY_OFFLINE.md
- Model/WASM bundling decision: docs/ADR-001-EMBEDDED-MEDIAPIPE.md

Canonical editable source: src/index.template.html
Build using: scripts/check-powershell-syntax.ps1, then scripts/check-repository.ps1
Generated artifacts: passage-counter.html, dist/index.html, dist/index.self-extract.html
Do not edit generated HTML files manually.

The AI model, WASM loader, both WASM binary variants, and code must be
present inside the one-file HTML from the very first milestone.
