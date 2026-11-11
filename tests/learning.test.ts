import { describe, it, expect } from "vitest";
import {
  schedule,
  freshReview,
  grade,
  normalize,
  exportCsv,
  parseCsv,
  DAY,
} from "../src/learning";
import { StateSchema, emptyState, UnitSchema } from "../src/schema";
import { readFileSync, readdirSync } from "node:fs";
describe("scheduling", () => {
  it("handles all ratings deterministically", () => {
    expect(schedule(freshReview(), "again", 100).due).toBe(600100);
    expect(schedule(freshReview(), "hard", 0).interval).toBe(1);
    expect(schedule(freshReview(), "good", 0).due).toBe(DAY);
    expect(schedule(freshReview(), "easy", 0).interval).toBe(4);
    expect(
      schedule(schedule(freshReview(), "good", 0), "good", DAY).interval,
    ).toBe(3);
  });
  it("bounds difficulty and long intervals", () => {
    let s = freshReview();
    for (let i = 0; i < 200; i++) s = schedule(s, "easy", 0);
    expect(s.interval).toBe(3650);
    expect(s.ease).toBe(3);
    for (let i = 0; i < 200; i++) s = schedule(s, "again", 0);
    expect(s.ease).toBe(1.3);
    expect(s.lapses).toBe(200);
  });
});
describe("grading", () => {
  it("normalizes Unicode, harmless case, spaces, punctuation but keeps accents", () => {
    expect(normalize(" ¿Si\u0301,  por favor! ")).toBe("sí por favor");
    expect(normalize("él")).not.toBe(normalize("el"));
    expect(normalize("si")).not.toBe(normalize("sí"));
  });
  for (const name of readdirSync("content/units").filter((x) =>
    x.endsWith(".json"),
  )) {
    const u = UnitSchema.parse(
      JSON.parse(readFileSync("content/units/" + name, "utf8")),
    );
    it(`${name}: accepts every authored answer and rejects distractors`, () => {
      for (const q of u.quiz) {
        for (const a of q.answers) expect(grade(q, a), q.id).toBe(true);
        for (const o of q.options ?? [])
          if (!q.answers.includes(o)) expect(grade(q, o), q.id).toBe(false);
        expect(grade(q, "")).toBe(false);
      }
    });
  }
});
it("CSV roundtrips commas, quotes, newlines and Spanish", () => {
  const cards = [
    {
      id: "custom-1",
      unit: "custom",
      kind: "production" as const,
      front: 'Say "yes", please\nnow',
      back: "Sí, por favor",
      example: "Sí.",
    },
  ];
  expect(parseCsv(exportCsv(cards))).toEqual(cards);
  expect(() => parseCsv("wrong,header")).toThrow();
  expect(() =>
    parseCsv('id,unit,kind,front,back,example\n"unclosed'),
  ).toThrow();
});
it("backup validation rejects future versions and invalid data", () => {
  expect(StateSchema.parse(emptyState())).toEqual(emptyState());
  expect(() => StateSchema.parse({ ...emptyState(), version: 2 })).toThrow();
  expect(() =>
    StateSchema.parse({ ...emptyState(), reviews: { x: { interval: -1 } } }),
  ).toThrow();
  expect(() =>
    StateSchema.parse({
      ...emptyState(),
      recordings: [{ id: "x", name: "x", data: "https://remote/audio", at: 0 }],
    }),
  ).toThrow();
});
