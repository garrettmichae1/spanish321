import { z } from "zod";
export const CardSchema = z.object({
  id: z.string(),
  front: z.string().min(1),
  back: z.string().min(1),
  example: z.string(),
  kind: z.enum(["recognition", "production"]),
  unit: z.string(),
});
export const QuestionSchema = z.object({
  id: z.string(),
  type: z.enum(["choice", "cloze", "typed", "matching"]),
  prompt: z.string().min(8),
  options: z.array(z.string()).optional(),
  answers: z.array(z.string()).min(1),
  explanation: z.string().min(25),
  concept: z.string(),
});
export const UnitSchema = z.object({
  id: z.string(),
  course: z.number().int().min(1).max(5),
  number: z.number().int().min(1).max(12),
  title: z.string(),
  subtitle: z.string(),
  status: z.enum(["authored", "planned"]),
  prerequisites: z.array(z.string()),
  objectives: z.array(z.string()).min(3).max(5),
  warmup: z.string(),
  lectures: z
    .array(z.object({ title: z.string(), body: z.string().min(100) }))
    .min(2)
    .max(4),
  reading: z.string().min(100),
  worked: z
    .array(
      z.object({
        prompt: z.string(),
        answer: z.string(),
        reason: z.string().min(20),
      }),
    )
    .min(6),
  cards: z.array(CardSchema).min(15).max(25),
  quiz: z.array(QuestionSchema).min(12).max(20),
  homework: z
    .array(
      z.object({
        id: z.string(),
        skill: z.string(),
        prompt: z.string(),
        model: z.string(),
        rubric: z.string(),
      }),
    )
    .min(3)
    .max(5),
  task: z.string(),
  culture: z.string().min(80),
  selfAssessment: z.array(z.string()).min(3),
  remediation: z.string(),
  resources: z.array(z.string()).min(1),
});
export type Unit = z.infer<typeof UnitSchema>;
export type Card = z.infer<typeof CardSchema>;
export type Question = z.infer<typeof QuestionSchema>;
export const ReviewSchema = z.object({
  interval: z.number().min(0).max(3650),
  ease: z.number().min(1.3).max(3),
  due: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
});
export type Review = z.infer<typeof ReviewSchema>;
export type Rating = "again" | "hard" | "good" | "easy";
export const StateSchema = z.object({
  version: z.literal(1),
  completed: z.array(z.string()),
  reviews: z.record(z.string(), ReviewSchema),
  history: z.array(
    z.object({
      id: z.string(),
      at: z.number(),
      rating: z.enum(["again", "hard", "good", "easy"]),
    }),
  ),
  attempts: z.array(
    z.object({
      unit: z.string(),
      mode: z.enum(["practice", "assessment"]),
      at: z.number(),
      answers: z.record(z.string(), z.string()),
      score: z.number(),
      total: z.number(),
    }),
  ),
  homework: z.record(
    z.string(),
    z.object({
      text: z.string(),
      evaluation: z.enum(["unassessed", "self", "peer", "instructor"]),
      updated: z.number(),
    }),
  ),
  logs: z.array(
    z.object({
      id: z.string(),
      text: z.string(),
      at: z.number(),
      minutes: z.number().min(0),
      kind: z.enum(["listening", "speaking", "interaction"]),
    }),
  ),
  recordings: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      data: z.string().startsWith("data:audio/").max(15000000),
      at: z.number(),
    }),
  ),
  customCards: z.array(CardSchema),
  dailyLimit: z.number().int().min(1).max(200),
  textScale: z.number().min(1).max(1.5),
});
export type LearnerState = z.infer<typeof StateSchema>;
export const emptyState = (): LearnerState => ({
  version: 1,
  completed: [],
  reviews: {},
  history: [],
  attempts: [],
  homework: {},
  logs: [],
  recordings: [],
  customCards: [],
  dailyLimit: 20,
  textScale: 1,
});
