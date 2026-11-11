import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { UnitSchema } from "../src/schema";
import { exportCsv } from "../src/learning";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import Markdown from "react-markdown";
import resources from "../content/resources.json";
mkdirSync("release/guides", { recursive: true });
mkdirSync("release/flashcards", { recursive: true });
const combined = [];
for (const f of readdirSync("content/units").filter((x) =>
  x.endsWith(".json"),
)) {
  const u = UnitSchema.parse(
    JSON.parse(readFileSync("content/units/" + f, "utf8")),
  );
  const md = `# Spanish I · Unit ${u.number}\n# ${u.title}\n\nAuthored draft · Spanish-educator review pending. Approximately 5–8 hours, not a deadline.\n\n## Objectives\n${u.objectives.map((o) => "- " + o).join("\n")}\n\n## Prerequisites & warm-up\n${u.prerequisites.join(", ") || "No prior Spanish."}\n\n${u.warmup}\n\n${u.lectures.map((l) => "## " + l.title + "\n\n" + l.body).join("\n\n")}\n\n## Read in context\n${u.reading}\n\n## Worked examples\n${u.worked.map((w, i) => `### ${i + 1}. ${w.prompt}\n**Answer:** ${w.answer}\n\n**Reasoning:** ${w.reason}`).join("\n\n")}\n\n## Resource assignment\n${resources
    .filter((r) => u.resources.includes(r.id))
    .map(
      (r) =>
        `### ${r.title} — ${r.creator}\n${r.url}\n\n${r.instructions}\n\n${r.access}. ${r.verification} ${r.checkedAt.slice(0, 10)}. Playback: ${r.playback}; captions: ${r.captions}.\n\nOffline alternative: ${r.offline}`,
    )
    .join(
      "\n\n",
    )}\n\n## Quiz\n${u.quiz.map((q, i) => `${i + 1}. ${q.prompt}${q.options ? " [" + q.options.join(" / ") + "]" : ""}`).join("\n\n")}\n\n## Homework\n${u.homework.map((h) => `### ${h.skill}\n${h.prompt}\n\n**Model:** ${h.model}\n\n**Rubric:** ${h.rubric}`).join("\n\n")}\n\n## Communication task\n${u.task}\n\n## Culture & variation\n${u.culture}\n\n## Self-assessment\n${u.selfAssessment.map((s) => "- " + s).join("\n")}\n\n${u.remediation}\n\n## Quiz answer key\n${u.quiz.map((q, i) => `${i + 1}. **${q.answers.join(" / ")}** — ${q.explanation}`).join("\n\n")}`;
  writeFileSync(`release/guides/${u.id}.md`, md);
  writeFileSync(
    `release/guides/${u.id}.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>${u.title}</title><style>body{font:16px/1.8 Georgia,serif;max-width:780px;margin:50px auto;padding:20px;color:#263e30}h1,h2,h3{line-height:1.3}h2{margin-top:40px}a{overflow-wrap:anywhere}@media print{body{margin:0;font-size:11pt}h2{break-after:avoid}@page{margin:18mm}}</style>${renderToStaticMarkup(createElement(Markdown, { children: md }))}</html>`,
  );
  writeFileSync(`release/flashcards/${u.id}.csv`, exportCsv(u.cards));
  combined.push(md);
}
writeFileSync("release/guides/spanish-I.md", combined.join("\n\n---\n\n"));
console.log(
  "Generated printable HTML/Markdown guides and UTF-8 flashcard CSVs for 12 authored units.",
);

// Cumulative guides reference the same validated item bank as the application.
const assessments = JSON.parse(
  readFileSync("content/assessments.json", "utf8"),
) as {
  id: string;
  title: string;
  instructions: string;
  questions: string[];
  task: string;
  rubric: string;
}[];
const bank = readdirSync("content/units")
  .filter((f) => f.endsWith(".json"))
  .flatMap(
    (f) =>
      UnitSchema.parse(JSON.parse(readFileSync("content/units/" + f, "utf8")))
        .quiz,
  );
for (const assessment of assessments) {
  const questions = assessment.questions.map((id) =>
    bank.find((q) => q.id === id)!,
  );
  const guide = `# ${assessment.title}\n\n${assessment.instructions}\n\n## Questions\n${questions.map((q, i) => `${i + 1}. ${q.prompt}${q.options ? " [" + q.options.join(" / ") + "]" : ""}`).join("\n\n")}\n\n## Performance task\n${assessment.task}\n\n## Rubric\n${assessment.rubric}\n\n## Answer key\n${questions.map((q, i) => `${i + 1}. **${q.answers.join(" / ")}** — ${q.explanation}`).join("\n\n")}`;
  writeFileSync(`release/guides/${assessment.id}.md`, guide);
  writeFileSync(
    `release/guides/${assessment.id}.html`,
    `<!doctype html><html lang="en"><meta charset="utf-8"><title>${assessment.title}</title><style>body{font:16px/1.8 Georgia,serif;max-width:780px;margin:45px auto;padding:20px}h2{margin-top:40px}@media print{body{margin:0;font-size:11pt}@page{margin:18mm}}</style>${renderToStaticMarkup(createElement(Markdown, { children: guide }))}</html>`,
  );
}
