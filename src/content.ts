import { UnitSchema } from "./schema";
import syllabus from "../content/syllabus.json";
import resources from "../content/resources.json";
const modules = import.meta.glob("../content/units/*.json", {
  eager: true,
  import: "default",
});
export const units = Object.values(modules)
  .map((u) => UnitSchema.parse(u))
  .sort((a, b) => a.id.localeCompare(b.id));
export { syllabus, resources };

export { default as assessments } from "../content/assessments.json";
