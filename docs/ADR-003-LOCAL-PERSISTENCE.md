# ADR-003 — Local session persistence, recovery and interval aggregation

Date: 2026-10-11
Status: Implemented in Draft v0.4.0; real mobile/long-session acceptance pending

## Storage ownership and data minimization

Only the user device/browser origin is used. The AI model, camera frames and person track points stay in volatile memory. No image, microphone audio, facial feature, device ID or per-person long-lived ID is saved or uploaded.

- **localStorage:** UI preference (language, line endpoints, front/rear preference, direction names, overlay toggle).
- **IndexedDB** database \`passage-counter-sessions-v1\`, version 1:
  - \`sessions\` object store: primary key \`sessionId\`. \`SessionV1\` includes schemaVersion, UUID, name, created/started/ended/update timestamps, current state, line, directionLabels, configSegments, coverageIntervals, runtimeInfo, lastCheckpointAt.
  - \`events\` object store: primary key \`eventId\`; \`bySession\` index on sessionId. \`PassageEventV1\` includes schemaVersion, sessionId, eventId, ordinal, occurredAt, elapsedMs, sourceTimeMs=null, direction, directionLabel, kind, delta and referenceEventId.
- The formal spec's conceptual \`SessionV1.events[]\` is **normalized** into the IndexedDB \`events\` store rather than duplicated in the \`sessions\` record. Read operations reconstruct events in ordinal order.
- Database versioning is explicit. Browser storage is not guaranteed: quota, private mode, eviction and \`file://\` origin policy vary by browser.

## Transaction and failure behavior

- During counting, each crossing event, manual correction and Undo is first added to the in-memory ledger, then serialized in a **single read-write IndexedDB transaction** with its current session checkpoint. A serialized write queue preserves event order and prevents a stale snapshot overwriting a newer one.
- Independently, a snapshot is saved about every **5 seconds** while counting, and during pause, interruption, finish, session/name setting changes.
- An event is not claimed to be durable until the transaction completes. Crash before a transaction commits may lose the latest in-memory changes.
- On IndexedDB open/write failure, a persistent warning appears; the memory ledger still supports all three CSV exports. A successful save clears the warning, never silently masquerading as a previous success.
- Confirmed Delete removes the session and its indexed event records in a single transaction; Reset does the same for the currently selected session.

## Timeline and recovery

\`coverageIntervals[]\` is a list of \`{intervalId, type, startedAt, endedAt, reason}\` segments. The three types are \`observed\` (active camera count), \`paused\` (user paused) and \`missing\` (camera/tab/inference loss). An open segment uses \`endedAt=null\`.

At crash recovery, an open observed interval is closed at its **last committed checkpoint**, *not* at the time the user returns. A missing interval begins at that checkpoint. The saved session opens **interrupted and stopped**; it never resumes camera or counting automatically. User must reconnect, test placement and explicitly start counting. Paused sessions remain paused and finished sessions remain finished.

## Aggregation and CSV

- Select **5 / 15 / 60 minutes**. Buckets align to local wall-clock times, with timestamps serialized as ISO UTC; exports include the browser's time-zone identifier.
- Each bucket gives automatic A/B, signed manual/Undo delta A/B, final A/B, seconds observed/paused/missing and \`coverage_status\`: \`observed\`, \`partial\`, \`missing\`.
- If a window contains no observation but has missing/paused time, it must be marked **missing**, not assumed to be a zero count.
- Corrections made after a session ends are assigned to its final bucket so the sum of interval counts matches the session's final count; the underlying event retains its true timestamp.
- Exports use UTF-8 BOM and CSV quoting, with formula escaping applied to string/user columns without corrupting signed numeric deltas:
  - **Events:** original event-friendly fields plus session ID, schema kind \`auto\` / \`manual_adjustment\` / \`undo_adjustment\`, adjustment reference.
  - **Summary:** wall elapsed, observed/paused/missing ms and per-direction auto/manual/final counts.
  - **Intervals:** counts, observed/paused/missing seconds and coverage status per chosen bucket.
- Each export includes all bucket rows; the on-page timeline intentionally shows the most recent 16 for compact phone viewing.

## Verified and unverified

Automated Windows Chrome tests confirm session persistence through reload, interrupted restoration without auto-resume, deletion, memory rescue under disabled IndexedDB, model/camera operation with SIMD-only WebAssembly, bundled \`file://\` HTML and no external runtime HTTP requests. Pure tests cover boundary buckets, missing coverage, post-finish corrections, ledger restoration and invalid events.

**Not yet validated:** iOS Safari and Android Chrome physical devices, large and multi-day sessions, storage eviction, simultaneous editing of the same session in multiple tabs, long-running camera stability, and real-world person-counting accuracy. The development roadmap reserves performance, real-device and field validation for later gates.

The user merges pull requests; never merge automatically.
