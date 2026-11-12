import { readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { UnitSchema } from "../src/schema";
import { exportCsv } from "../src/learning";
import {
  unitGuide,
  printableHtml,
  questionText,
  answerText,
} from "../src/guides";
import resources from "../content/resources.json";
import syllabus from "../content/syllabus.json";
import assessments from "../content/assessments.json";
mkdirSync("release/guides", { recursive: true });
mkdirSync("release/flashcards", { recursive: true });
const units = readdirSync("content/units")
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) =>
    UnitSchema.parse(JSON.parse(readFileSync(`content/units/${f}`, "utf8"))),
  );
for (const u of units) {
  const md = unitGuide(u, resources, syllabus[u.course - 1].title);
  writeFileSync(`release/guides/${u.id}.md`, md);
  writeFileSync(`release/guides/${u.id}.html`, printableHtml(u.title, md));
  writeFileSync(`release/flashcards/${u.id}.csv`, exportCsv(u.cards));
}
for (const c of syllabus) {
  const courseUnits = units.filter((u) => u.course === c.id);
  const md = courseUnits
    .map((u) => unitGuide(u, resources, c.title))
    .join("\n\n---\n\n");
  writeFileSync(`release/guides/course-${c.id}.md`, md);
  writeFileSync(
    `release/guides/course-${c.id}.html`,
    printableHtml(c.title, md),
  );
  writeFileSync(
    `release/flashcards/course-${c.id}.csv`,
    exportCsv(courseUnits.flatMap((u) => u.cards)),
  );
}
writeFileSync(
  "release/flashcards/all-courses.csv",
  exportCsv(units.flatMap((u) => u.cards)),
);
const bank = units.flatMap((u) => u.quiz);
for (const a of assessments) {
  const questions = a.questions.map((id) => bank.find((q) => q.id === id)!);
  const md = `# ${a.title}\n\n${a.instructions}\n\n## Questions\n${questions.map((q, i) => `${i + 1}. ${questionText(q)}`).join("\n\n")}\n\n## Performance task\n${a.task}\n\n## Rubric\n${a.rubric}\n\n## Answer key\n${questions.map((q, i) => `${i + 1}. **${answerText(q)}** — ${q.explanation}`).join("\n\n")}`;
  writeFileSync(`release/guides/${a.id}.md`, md);
  writeFileSync(`release/guides/${a.id}.html`, printableHtml(a.title, md));
}
console.log(
  `Generated ${units.length} unit guides, ${assessments.length} assessment guides, five course books, and flashcard CSVs from the bundled content.`,
);
