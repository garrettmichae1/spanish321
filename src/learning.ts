import type { Review, Rating, Card, Question } from "./schema";
export const DAY = 86400000;
export const freshReview = (): Review => ({
  interval: 0,
  ease: 2.5,
  due: 0,
  reps: 0,
  lapses: 0,
});
// Transparent SM-2-inspired schedule, not a claim of optimal retention. Native uses Rust.
export function schedule(old: Review, rating: Rating, now: number): Review {
  const r = { ...old, reps: old.reps + 1 };
  if (rating === "again") {
    r.interval = 0;
    r.ease = Math.max(1.3, r.ease - 0.2);
    r.lapses++;
    r.due = now + 600000;
    return r;
  }
  r.interval =
    rating === "hard"
      ? Math.max(1, Math.round(old.interval * 1.2))
      : rating === "easy"
        ? Math.max(4, Math.round(old.interval * old.ease * 1.3))
        : old.interval === 0
          ? 1
          : old.interval === 1
            ? 3
            : Math.round(old.interval * old.ease);
  r.interval = Math.min(3650, r.interval);
  r.ease = Math.min(
    3,
    Math.max(
      1.3,
      r.ease + (rating === "easy" ? 0.15 : rating === "hard" ? -0.15 : 0),
    ),
  );
  r.due = now + r.interval * DAY;
  return r;
}
export function normalize(s: string) {
  return s
    .normalize("NFC")
    .toLocaleLowerCase("es")
    .replace(/[¿?¡!.,;:”“"']/g, "")
    .trim()
    .replace(/\s+/g, " ");
}
export function grade(q: Question, answer: string) {
  return q.answers.some((a) =>
    q.options ? a === answer : normalize(a) === normalize(answer),
  );
}
export function exportCsv(cards: Card[]) {
  return (
    "\ufeff" +
    [
      ["id", "unit", "kind", "front", "back", "example"],
      ...cards.map((c) => [c.id, c.unit, c.kind, c.front, c.back, c.example]),
    ]
      .map((row) =>
        row.map((s) => '"' + s.replaceAll('"', '""') + '"').join(","),
      )
      .join("\r\n")
  );
}
export function parseCsv(input: string): Card[] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  input = input.replace(/^\ufeff/, "");
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c === '"') {
      if (quoted && input[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if (c === "\n" && !quoted) {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed CSV quotation.");
  if (cell || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  if (rows.shift()?.join(",") !== "id,unit,kind,front,back,example")
    throw Error("Use the documented six-column CSV header.");
  return rows
    .filter((r) => r.some(Boolean))
    .map((r) => {
      if (r.length !== 6) throw Error("Each CSV row needs six columns.");
      return {
        id: r[0],
        unit: r[1],
        kind: r[2] as Card["kind"],
        front: r[3],
        back: r[4],
        example: r[5],
      };
    });
}
