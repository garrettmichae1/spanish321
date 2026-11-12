import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import Markdown from "react-markdown";
import type { Unit, Question } from "./schema";
type Resource = {
  id: string;
  title: string;
  creator: string;
  url: string;
  instructions: string;
  access: string;
  verification: string;
  checkedAt: string;
  playback: string;
  captions: string;
  offline: string;
};
export function questionText(q: Question) {
  return `${q.prompt}${
    q.pairs
      ? "\n\n" +
        q.pairs.map((p) => p.left).join("; ") +
        "\n\nChoices: " +
        q.pairs
          .map((p) => p.right)
          .sort()
          .join("; ")
      : q.options
        ? " [" + q.options.join(" / ") + "]"
        : ""
  }`;
}
export function answerText(q: Question) {
  return q.pairs
    ? q.pairs.map((p) => `${p.left} → ${p.right}`).join("; ")
    : q.answers.join(" / ");
}
export function unitGuide(u: Unit, resources: Resource[], course: string) {
  return `# ${course} · Unit ${u.number}: ${u.title}

Original independent-study material · Qualified Spanish-educator review pending.
Approximately 5–8 hours, not a deadline. External media requires internet.

## Objectives
${u.objectives.map((o) => "- " + o).join("\n")}

## Prerequisites & retrieval warm-up
${u.prerequisites.join(", ") || "No prior Spanish."}

${u.warmup}

${u.lectures.map((l) => "## " + l.title + "\n\n" + l.body).join("\n\n")}

## Read in context
${u.reading}

## Worked practice
${u.worked.map((w, i) => `### ${i + 1}. ${w.prompt}\n**Answer:** ${w.answer}\n\n**Reasoning:** ${w.reason}`).join("\n\n")}

## Resource assignments
${resources
  .filter((r) => u.resources.includes(r.id))
  .map(
    (r) =>
      `### ${r.title} — ${r.creator}\n${r.url}\n\n${r.instructions}\n\n${r.access}. ${r.verification}, ${r.checkedAt.slice(0, 10)}. Playback: ${r.playback}. Captions: ${r.captions}.\n\nOffline alternative: ${r.offline}`,
  )
  .join("\n\n")}

## Flashcards: recall before checking
${u.cards.map((c) => `- ${c.front} → ${c.back} (${c.kind}). Example: ${c.example}`).join("\n")}

## Quiz
${u.quiz.map((q, i) => `${i + 1}. ${questionText(q)}`).join("\n\n")}

## Homework
${u.homework.map((h) => `### ${h.skill}\n${h.prompt}\n\n**Model / approach:** ${h.model}\n\n**Rubric:** ${h.rubric}`).join("\n\n")}

## Communication task
${u.task}

## Culture & variation
${u.culture}

## Self-assessment & review
${u.selfAssessment.map((s) => "- " + s).join("\n")}

${u.remediation}

## Quiz answer key
${u.quiz.map((q, i) => `${i + 1}. **${answerText(q)}** — ${q.explanation}`).join("\n\n")}`;
}
export function printableHtml(title: string, md: string) {
  const escape = (s: string) =>
    s.replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c]!,
    );
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escape(title)}</title><style>body{font:17px/1.8 Georgia,serif;max-width:780px;margin:50px auto;padding:24px;color:#263e30}h1,h2,h3{line-height:1.3}h2{margin-top:40px}a{overflow-wrap:anywhere}li{margin-bottom:8px}@media print{body{margin:0;font-size:11pt}h2,h3{break-after:avoid}@page{margin:18mm}}</style></head><body>${renderToStaticMarkup(createElement(Markdown, { children: md }))}</body></html>`;
}
export const unitGuideHtml = (u: Unit, resources: Resource[], course: string) =>
  printableHtml(u.title, unitGuide(u, resources, course));
