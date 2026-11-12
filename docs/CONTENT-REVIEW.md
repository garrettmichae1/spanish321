# Content and verification report

Review date: 2026-11-12. This is an engineering and editorial self-review, **not qualified Spanish-educator validation**. No independent educator review has occurred.

## Inventory

- Five sequential courses; all 60 units have authored content and enabled lessons.
- 148 original mini-lectures (about 15,042 words), 60 original readings/dialogues, 361 worked examples, 903 phrase/sentence cards, 735 unit quiz questions, and 240 homework activities.
- Every unit has 3–5 objectives, prerequisites/retrieval, 2–4 lectures, reading, resources, worked examples, 15–25 cards, 12–20 quiz questions, four homework activities, a practical task, cultural/regional notes and remediation.
- All five courses have entry checks, cumulative midterms/finals, performance tasks and transparent rubrics: 15 assessments total. They reference the published question bank; repeated success on known items is not independent proficiency evidence.
- All 60 unit guides, 15 assessment guides, five combined course books and CSVs are generated from the same bundled content. Standalone HTML guides can be printed to PDF.
- Forty-seven resource records distinguish successful retrieval, restrictions and unknown playback/caption status. Advanced assignments use precise selection criteria for changing authentic-media collections. No third-party text or media is copied into lessons.

## Editorial changes

The expansion includes object/reference clarity, personal a, prepositional pronouns, command/subjunctive bridges, participles, regional perfect-tense distribution, si-clause timelines, reported perspective, source synthesis, register, negotiation, literary interpretation and transfer of recurring-error repairs. Sixteen additional teaching passages explain particularly error-prone relationships in detail. Original fictional cases are identified as such; their numbers are not represented as research findings.

Answer keys accept specified legitimate alternatives, including relative constructions and common lexical variants. Ambiguous prompts were narrowed where useful. Automatic key tests prove agreement with the authored key, not that every possible natural-language response has been enumerated. Open communication tasks use human rubrics rather than pretending to offer semantic or fluency grading.

Original Spanish I activity IDs retain their meanings; new multi-pair activities have new IDs. Later-course entries were authored course by course, then checked for prerequisites, resource associations and cumulative assessment coverage.

## Engineering verification

- Production React/TypeScript build and complete-content validator pass.
- 65 frontend unit tests exercise scheduling, Unicode/accent distinctions, CSV roundtrip, backup rejection and all authored answer keys/distractors.
- 7 Rust tests exercise scheduling bounds, grading normalization, full schema validation across all units, SQLite migrations, rejected restore atomicity, reopening persistence, and content updates preserving retired IDs.
- Chromium E2E covers offline beginner/advanced learning, mobile navigation, valid and invalid backups, assessment separation, CSV collision rejection, simulated microphone persistence, search, complete matching, filtered reviews and printable export.
- Automated WCAG A/AA checks pass on nine core screens. This does not substitute for manual assistive-technology testing.

## Platforms and media

The 7.79 MiB Linux installer was installed over 0.1.0 with an existing version-1 database. Migration to version 2 preserved homework and registered all 60 content revisions. Native keyboard writing, reopening, the Save dialog and exported backup, one-day flashcard scheduling through Rust IPC, and microphone-consent cancellation passed. Physical audio capture remains unverified.

Native Linux verification and package checksums are recorded in `research/native/verification.json`. Tests use an unprivileged learner in a network-disabled Debian 13 x86_64 container with Xvfb and WebKitGTK. They are distinct from browser tests. Host native compilation lacked GTK/WebKit development packages; the container supplies the official prerequisites without disabling certificate or application sandbox checks.

macOS and Windows have installer build jobs; build results and functional installation tests must be reported separately. No signing/notarization is configured. Browser recording tests use generated test audio; they do not establish physical-device audio quality. Native permission prompts and synthetic-device behavior are likewise distinct from a physical microphone test.

Resource checks are in `research/resource-checks.json` and `research/expansion-resource-checks.json`. HTTP success and title inspection do not establish playback. The restricted YouTube playlist and unverified captions are labeled. External media requires internet; original written learning remains offline.

## Remaining validation

Qualified educator review, observed student sessions, manual screen-reader testing, physical microphone checks, and macOS/Windows installation/upgrade testing remain outstanding. Do not present the course as professionally validated or the entire media experience as offline. The independent-study materials and engineering results are provided with these limits visible.

The existing GPL-3.0 license remains. Separate CC BY-SA 4.0 educational-content licensing is proposed pending confirmation. Source pushes to the requested main branch are authorized; no public binary release is created. Local installers, study packs, checksums and dependency metadata are prepared for review.
