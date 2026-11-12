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
  if (/\bTODO\b|[Ll]orem ipsum/.test(JSON.stringify(u)))
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
  `Validated ${readdirSync("content/units").filter((f) => f.endsWith(".json")).length} authored units, ${cards} cards, ${questions} answer keys; all 60 syllabus units must be authored.`,
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
const files = readdirSync("content/units").filter((f) => f.endsWith(".json"));
const authored = files.map((f) =>
  UnitSchema.parse(JSON.parse(readFileSync(`content/units/${f}`, "utf8"))),
);
if (syllabus.length !== 5 || authored.length !== 60)
  throw Error("The release requires all five courses and 60 units");
for (const c of syllabus) {
  if (
    c.units.length !== 12 ||
    authored.filter((u) => u.course === c.id).length !== 12
  )
    throw Error("Course does not have 12 authored units");
  for (const u of c.units) {
    const full = authored.find((x) => x.id === u.id);
    if (!full || full.status !== "authored" || u.status !== "authored")
      throw Error("Unfinished unit " + u.id);
    if (JSON.stringify(full.prerequisites) !== JSON.stringify(u.prerequisites))
      throw Error("Prerequisites disagree " + u.id);
  }
  const exams = (
    assessments as { id: string; questions: string[]; course?: number }[]
  ).filter((a) => a.course === c.id);
  if (exams.length !== 3)
    throw Error(
      "Missing entry, midterm or final assessment for course " + c.id,
    );
  for (const suffix of ["entry", "midterm", "final"])
    if (!exams.some((a) => a.id.includes(suffix)))
      throw Error("Missing assessment " + c.id + suffix);
}
for (const u of authored) {
  for (const q of u.quiz) {
    if (q.type === "matching" && q.pairs) {
      if (
        new Set(q.pairs.map((p) => p.left)).size !== q.pairs.length ||
        new Set(q.pairs.map((p) => p.right)).size !== q.pairs.length
      )
        throw Error("Ambiguous matching " + q.id);
      const wrong = q.pairs.map((p) => p.right).reverse();
      if (grade(q, JSON.stringify(wrong)))
        throw Error("Incorrect matching accepted " + q.id);
    }
  }
  for (const id of u.resources) {
    const r = resources.find((r) => r.id === id)!;
    if (
      !r.units.includes(u.id) ||
      !r.offline ||
      !r.checkedAt ||
      !r.verification
    )
      throw Error("Incomplete resource metadata " + id);
  }
}
console.log(
  "All five courses, prerequisites, assessment coverage, and resource associations passed.",
);
