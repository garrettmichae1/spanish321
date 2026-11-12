import { z } from "zod";
import { writeFileSync } from "node:fs";
import { UnitSchema, StateShape } from "../src/schema";
writeFileSync(
  "content/unit.schema.json",
  JSON.stringify(z.toJSONSchema(UnitSchema), null, 2),
);
writeFileSync(
  "content/backup.schema.json",
  JSON.stringify(z.toJSONSchema(StateShape), null, 2),
);
// Hashes identify content revisions; learner records always keep stable IDs.
const { readFileSync, readdirSync } = await import("node:fs");
const { createHash } = await import("node:crypto");
const manifest = Object.fromEntries(
  readdirSync("content/units")
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => [
      f.slice(0, -5),
      createHash("sha256")
        .update(readFileSync(`content/units/${f}`))
        .digest("hex"),
    ]),
);
writeFileSync(
  "content/manifest.json",
  JSON.stringify(manifest, null, 2) + "\n",
);
