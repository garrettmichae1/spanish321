# Architecture, privacy, and content lifecycle

React + TypeScript renders a local application. Tauri 2 hosts the bundled frontend. Rust manages native SQLite persistence and scheduling. The browser preview uses IndexedDB and an equivalent TypeScript scheduler. Tests cover both algorithms; browser E2E is not a native WebKit test.

`content/syllabus.json` carries all 60 IDs and authored/planned status. `content/units/*.json` carries original Markdown strings, objectives, cards, worked exercises, answer keys, rubrics, and stable activity IDs. `src/schema.ts` is the authoritative Zod schema. Generated JSON Schema files permit review without app code. `npm run validate` checks the schema, ID uniqueness, prerequisite references, resource references and answer keys. Rust uses the same generated JSON Schemas for deep validation of all unit fields and learner state. Its validator has HTTP and file resolution disabled. The authoring validator additionally checks cross-document IDs, resources, prerequisites and assessment coverage.

`crates/learning-core` is independent of platform GUI libraries. `src-tauri` exposes only load_state, save_state, schedule_review, export_file, and request_microphone; its main local window alone has capabilities. Remote pages are never loaded into the webview. HTTPS links open through the system browser. No shell plugin, broad filesystem API, remote IPC, telemetry, authentication, cloud storage or paid API is included. CSP denies frames and remote script connections.

## Persistence

Native data lives in the Tauri application-data directory as learner.sqlite3, separate from packaged content. Migration 1 creates a singleton learner state plus a previous-snapshot recovery table in a transaction and sets PRAGMA user_version=1. Migration 2 adds a stable-ID/content-hash manifest; updating its revisions never deletes learner records. Future schema versions are refused rather than downgraded. Writes are serialized in the frontend and transactional in SQLite. State contains stable unit/card/homework IDs, attempts, review history, logs, recordings and settings. The complete schema is validated at both the UI and Rust IPC boundaries, with additional score/count and duplicate-card checks. Invalid restoration cannot overwrite the current SQLite state.

Browser data is in IndexedDB `spanish321`, store `learner`, key `state`. Browser clearing removes it; export regularly. The built preview precaches original assets with a versioned service worker. An update waits until old tabs close, avoiding a mixed-version session. Native assets are packaged; no service worker is installed there.

Version-1 JSON backup includes local audio data. The UI validates before replacing, confirms the destructive replacement, and preserves existing data on validation failure. Imported CSV uses `id,unit,kind,front,back,example`; quote fields and double internal quotes. UTF-8/BOM, CRLF, newlines inside quotes, and accents are supported. IDs cannot collide with bundled or existing cards. Spreadsheet consumers should import cells as text; exported user-created card values are not formula-sanitized.

Content updates retain IDs and therefore retain learner work. Never reuse an ID for a different question. Keep retired IDs in learner backups; author a migration mapping for an intentional rename. Unknown IDs are preserved rather than deleted. There is no network updater in this preview.

## Review algorithm

SM-2-inspired, deliberately transparent; not FSRS and not an empirical retention claim. Times are epoch milliseconds; intervals are days. Initial ease 2.5, interval 0, due immediately. Every rating increments reviews:

- Again: interval 0, due in 10 minutes, ease −0.20, lapses +1.
- Hard: max(1, round(previous interval × 1.2)), ease −0.15.
- Good: first interval 1; previous interval 1 → 3; otherwise round(interval × ease).
- Easy: max(4, round(interval × ease × 1.3)), ease +0.15.

Ease stays in [1.3,3]; intervals cap at 3,650 days. Non-Again due date is now + interval × 86,400,000. The daily UI limit counts all ratings on the local calendar day; due dates use elapsed time across DST. Again reviews return after ten minutes but do not bypass the daily limit. Clock changes can affect due status; no server time is used.

Selected-option questions compare exact option values (capitalization can encode stress). Typed answers use NFC, case folding, collapsed whitespace, and a limited punctuation filter. Accents and ñ are retained. Accepted variants belong in each question’s answers array; semantic free-text grading is not claimed. Multi-pair matching compares all three selected pairings; a partial match does not count as a correct item. Earlier single-pair questions remain usable so published question IDs keep their meanings.

## Recordings and speech

MediaRecorder requests microphone permission on Start only, stops tracks after recording or navigation, and stores a data URL locally. Clips stop at three minutes or a size guard. Runtime support differs; desktop permission integration and native recording still need platform tests. Device speech lists local Spanish voices only, labels synthesis, and degrades to reading preparation if unavailable. No speech recognition or pronunciation score exists.

## Native build verification

`scripts/Dockerfile.linux` uses a single source COPY and build RUN to fit managed VFS storage. First run `npm ci && npm run build`, then build with the proxy CA secret as described by the environment runtime; no certificate verification is disabled. Native smoke testing installs the Debian package and runs `scripts/native-smoke.sh` as the learner test user in a network-disabled container. The test exercises actual keyboard entry and SQLite-backed recovery, but native physical microphone and screen readers require further device-level testing. Native save dialogs are exercised separately by the export smoke test.

## Export boundary

The desktop export command opens a native Save dialog and writes only to the chosen destination. JavaScript supplies a suggested basename and bytes, never an arbitrary filesystem path. No broad filesystem capability is granted. Canceling the dialog writes nothing. Export errors appear in the app. Browser exports use Blob downloads. Both use the same guide generator and CSV serializer.

The review queue defaults to completed units plus the next unit and any previously reviewed/imported cards. Learners can deliberately select another course or unit. All 60 units are bundled, so the initial JavaScript asset is larger than a conventional web landing page; it is cached once and requires no content server.

Microphone authorization has a dedicated native dialog before capture. The permission handler permits only audio capture from the local main webview after that explicit choice; camera, display capture, location and other permission kinds are denied. macOS purpose text and audio-input entitlement are configured. Physical-device behavior still needs per-platform testing.
