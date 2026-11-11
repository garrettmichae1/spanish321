import { z } from "zod";
import { writeFileSync } from "node:fs";
import { UnitSchema, StateSchema } from "../src/schema";
writeFileSync(
  "content/unit.schema.json",
  JSON.stringify(z.toJSONSchema(UnitSchema), null, 2),
);
writeFileSync(
  "content/backup.schema.json",
  JSON.stringify(z.toJSONSchema(StateSchema), null, 2),
);
