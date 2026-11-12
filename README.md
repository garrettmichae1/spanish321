# Spanish321

A calm, free, offline Spanish-learning application built with **Tauri 2, Rust, React, TypeScript and SQLite**. Five sequential courses contain **60 authored units**, from foundational sounds to academic and professional communication. The interface takes general inspiration from Linear and Notion, with original styling and artwork.

The library contains 148 original mini-lectures, 60 readings/dialogues, 361 worked examples, 903 flashcards, 735 unit quiz questions, 240 homework activities, and 15 course assessments with performance tasks and transparent rubrics. There are no disabled outline-only courses. **Qualified Spanish-educator review has not occurred.** Engineering tests verify software and answer-key behavior, not professional pedagogical validation or proficiency certification.

![Spanish321 dashboard](research/dashboard.png)

## Learning on your device

- Read lessons, examples and regional notes, with recommended prerequisites and retrieval warm-ups.
- Practice recognition and production cards with spaced repetition, daily limits, course/unit filters and difficult-item review.
- Complete multiple choice, multi-pair matching, cloze and typed questions with explanations. Spanish accents remain meaningful; explicit valid variants are accepted.
- Keep practice and assessment attempts separate from reading completion and human-evaluated communication.
- Write homework, keep listening and conversation logs, record locally with explicit microphone permission, and collect a portfolio.
- Search all bundled lesson text and the resource catalog. External resources open in your browser and are labeled as requiring internet.
- Export complete printable lesson guides, flashcard CSVs, portfolio data and versioned backups.

No account, subscription, paid API, ongoing server, telemetry or default upload. All original written content, exercises, reviews, writing, saved audio and exports work locally. External media is linked, not bundled. Device speech is labeled synthetic and only uses an available local Spanish voice.

## Installation for learners

Locally prepared installers and study packs are in `release/`. The Linux package is `release/native/Spanish321_0.2.0_amd64.deb`; verify the accompanying SHA-256 checksums before installing:

```sh
sudo apt install ./Spanish321_0.2.0_amd64.deb
```

Then launch **Spanish321** from your applications menu. Dependencies may require internet during installation; the course itself is packaged. This is an unsigned independent-study build, not a signed public release. See [verification scope and limitations](docs/CONTENT-REVIEW.md) and the [user guide](docs/USER-GUIDE.md).

Linux Debian 13 x86_64 is the primary native test platform. macOS Apple Silicon DMG and Windows x64 NSIS packages built successfully in CI; a successful build is distinct from installation, microphone, screen-reader and upgrade testing on those operating systems. Public releases are not published automatically.

## Development from source

Node 22.12+ and stable Rust are required; this workspace used Node 24 and Rust 1.99. Install the [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/) for your operating system. Linux requires WebKitGTK 4.1 and native build libraries, Windows requires Microsoft C++ Build Tools and WebView2, and macOS requires Xcode Command Line Tools. Host GTK/WebKit prerequisites were missing in this managed environment, so native Linux builds use the documented Debian container.

```sh
npm ci
npm run validate
npm test
cargo test -p spanish321-core --locked
npm run build
npm run test:e2e
npm run guides
npm run tauri -- dev
```

`npm run dev` or `npm run preview` runs a browser preview using IndexedDB. The desktop app uses SQLite in its application-data directory. Browser E2E is not a native WebKit test. Playwright uses this workspace’s installed Chromium unless CI or `PLAYWRIGHT_CHROMIUM_EXECUTABLE` selects another executable.

Build on the corresponding platform:

```sh
npm run tauri -- build --bundles deb   # Linux
npm run tauri -- build --bundles dmg   # macOS
npm run tauri -- build --bundles nsis  # Windows
```

The desktop CI matrix builds installer artifacts without creating a public GitHub release. Signing/notarization is not configured. The Linux Dockerfile requires a trusted CA secret for this managed environment; no certificate verification is disabled.

## Content and verification

The authoritative bundled content is `content/units/*.json`, with original Markdown in schema-validated records. Stable IDs keep learner work intact across updates. `content/syllabus.json` defines the sequence; `content/assessments.json` references tested question banks. The resource catalog records retrieval dates, access uncertainty, instructions and offline alternatives. **Page retrieval is not playback verification.**

```sh
node --import tsx scripts/schema.ts  # JSON schemas + content revision manifest
npm run validate                   # all 60 units, keys, references and assessments
npm run guides                     # HTML/Markdown books and UTF-8 CSVs
node scripts/pdf-guides.mjs         # optional: PDF guides using installed Chromium
python scripts/check-resources.py # refresh retrieval evidence; review results
```

Authoring source records for Courses II–V are in `scripts/authoring/`. After regenerating those records, run `python scripts/authoring/enrichment.py`, `python scripts/authoring/card-context.py`, `python scripts/refine-content.py`, then regenerate schemas/manifest and validate. Never reuse a published activity ID for a different task.

See the [complete syllabus](docs/SYLLABUS.md), [educator review packet](docs/EDUCATOR-REVIEW.md), [curriculum audit](docs/CURRICULUM.md), [architecture and scheduling algorithm](docs/ARCHITECTURE.md), [content review report](docs/CONTENT-REVIEW.md), and [remaining release checks](docs/RELEASE-GATES.md).

The existing GPL-3.0 license is preserved. A separate CC BY-SA 4.0 license for original educational content is proposed, not activated; confirm that choice before a public release. Third-party resources retain their own terms. No creator audio, video, transcript, quiz or article is redistributed.
