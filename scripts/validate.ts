import { readFileSync, readdirSync } from "node:fs";
import { UnitSchema } from "../src/schema";
import { grade } from "../src/learning";
import syllabus from "../content/syllabus.json";
import resources from "../content/resources.json";
const ids = new Set<string>();
let questions = 0,
  cards = 0;
for (const file of readdirSync("content/units").filter((f) =>
  f.endsWith(".json"),
)) {
  const u = UnitSchema.parse(
    JSON.parse(readFileSync(`content/units/${file}`, "utf8")),
  );
  if (ids.has(u.id)) throw Error("Duplicate unit");
  ids.add(u.id);
  const s = syllabus.flatMap((c) => c.units).find((x) => x.id === u.id);
  if (!s || s.title !== u.title) throw Error("Syllabus mismatch " + u.id);
  for (const obj of [...u.cards, ...u.quiz, ...u.homework]) {
    if (ids.has(obj.id)) throw Error("Duplicate id " + obj.id);
    ids.add(obj.id);
  }
  for (const card of u.cards) {
    if (card.unit !== u.id) throw Error("Card unit mismatch");
    cards++;
  }
  for (const q of u.quiz) {
    for (const a of q.answers) {
      if (!grade(q, a)) throw Error("Rejected answer " + q.id);
      if (q.options && !q.options.includes(a))
        throw Error("Answer missing from options " + q.id);
    }
    if (grade(q, "intentionally wrong response 𐀀")) throw Error("Bad grading");
    if (q.options && new Set(q.options).size !== q.options.length)
      throw Error("Duplicate option " + q.id);
    questions++;
  }
  for (const r of u.resources)
    if (!resources.some((x) => x.id === r))
      throw Error("Unresolved resource " + r);
  if (/\bTODO\b|lorem ipsum/i.test(JSON.stringify(u)))
    throw Error("Placeholder in authored unit");
}
for (const c of syllabus)
  for (const u of c.units) {
    for (const p of u.prerequisites) {
      if (
        p >= u.id ||
        !syllabus.flatMap((x) => x.units).some((x) => x.id === p)
      )
        throw Error("Broken/cyclic prerequisite " + p);
    }
  }
console.log(
  `Validated ${readdirSync("content/units").filter((f) => f.endsWith(".json")).length} authored units, ${cards} cards, ${questions} answer keys; 48 planned units are NOT complete.`,
);
const assessments = JSON.parse(
  readFileSync("content/assessments.json", "utf8"),
) as { id: string; questions: string[] }[];
for (const a of assessments) {
  if (new Set(a.questions).size !== a.questions.length)
    throw Error("Duplicate assessment question");
  for (const q of a.questions)
    if (!ids.has(q)) throw Error("Missing assessment question " + q);
}
console.log(
  "Validated entry, cumulative midterm and cumulative final question references.",
);
