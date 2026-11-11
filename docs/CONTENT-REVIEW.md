# Content and verification report

Review date: 2026-11-11. This report describes an engineering self-review, **not** qualified Spanish-educator validation. No independent educator review has occurred.

## Actual inventory

- 60 sequential syllabus entries across five courses.
- 12 authored Spanish I drafts; 48 later-course entries are planned and disabled in the course map.
- 36 original mini-lectures (about 3,549 words), 12 original readings/dialogues, 73 worked examples, 183 flashcards, 147 unit quiz items and 48 homework activities.
- Spanish I entry check (6 questions), cumulative midterm (18), and cumulative final (24), drawn transparently from tested unit banks; practical speaking/writing tasks and an analytic rubric are included. New assessment forms and independent answer-key review remain necessary.
- Unit 1 receives the most detailed treatment. Units 2–12 need further pedagogical editing, more individualized media assignments, and greater variety beyond controlled form and phrase-selection questions.
- Printable HTML/Markdown guides and unit CSVs are generated from the same source. Answer explanations are present; automatic acceptance tests do not prove linguistic correctness.

## Verified in this workspace

- Production React/TypeScript build.
- 17 frontend tests, including every authored answer and every supplied distractor, normalization/accents, CSV roundtrip, schedule bounds, and invalid-backup rejection.
- 6 Rust core tests: rating schedule, interval/ease bounds, accent handling, migrations/atomic invalid-restore rejection, persistence after reopening SQLite, and content-completeness checks.
- 7 Chromium end-to-end tests: offline lessons/quizzes/homework/reviews and reload; mobile layout and planned-course status; malformed restore preservation; valid restore with retired IDs retained and assessment attempts distinct; CSV import/collision prevention; simulated microphone capture and reopen; automated accessibility across five core screens.
- Axe WCAG A/AA checks found no automatic violations on the tested screens after contrast corrections. This does not substitute for manual screen-reader or disability-user testing.
- Resource page retrieval checks. All resources assigned to authored units have successful HTTP retrieval evidence. YouTube playlist access was restricted here. Caption and video/audio playback availability are explicitly not verified. See research/resource-checks.json, content/resources.json, and the refresh script.

## Platform status

- Linux host: Debian 13 x86_64, Node 24.22.1, workspace Rust 1.99.1. Host native compilation initially blocked by missing GTK/WebKit/GLib development packages and unavailable sudo/package helper.
- Linux container: isolated Docker compilation and packaging attempt uses official Rust/Debian image and current Tauri 2 crates. Final native outcome is recorded below when verification finishes.
- macOS and Windows: packaging configuration and manual GitHub Actions matrix only. Not compiled, installed or tested here. No signing/notarization configured.
- Browser microphone test uses generated test audio. It proves local capture/persistence wiring, not physical-device sound quality or desktop OS permission behavior.

## Known limitations and release decision

Not production-ready for the requested complete course. Courses II–V must be authored and reviewed; student-facing educational completeness cannot be inferred from code tests. Native installation/upgrade tests, deep Rust-side backup validation, platform microphone/export checks, full human accessibility review, and qualified educator review remain release gates. No pronunciation, fluency, CEFR certification, college credit or accreditation claim is made.

Existing GPL-3.0 is preserved. Proposed separate CC BY-SA 4.0 educational-content licensing needs owner confirmation before a public release. Third-party works are linked only. Pushing source to the user-requested main branch does not mark an end-user release.
