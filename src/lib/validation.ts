import { z } from "zod";
import { catalog } from "./catalog";
const n = z.number().finite().nonnegative();
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(v + "T12:00:00Z");
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, "Enter a valid calendar date.");
const exerciseId = z
  .string()
  .refine((id) => !!catalog[id], "Unknown exercise.");
const planned = z
  .object({
    id: z.string(),
    exerciseId,
    sets: n.int().min(1).max(10),
    min: n.int().min(1).max(7200),
    max: n.int().min(1).max(7200),
    rest: n.int().max(600),
    weight: n.max(500).optional(),
  })
  .refine((p) => p.max >= p.min);
const log = z
  .object({
    id: z.string(),
    exerciseId,
    set: n.int().min(1),
    side: z.enum(["both", "left", "right"]),
    reps: n.int().max(1000).nullable(),
    repRange: z.string().max(50).optional(),
    seconds: n.max(7200).optional(),
    weight: n.max(500),
    unit: z.enum(["kg", "lb", "bodyweight"]),
    difficulty: z.enum(["Easy", "Moderate", "Hard"]),
    rir: n.int().max(20).nullable(),
    pain: z.boolean(),
    technique: z.boolean(),
    notes: z.string().max(2000),
  })
  .superRefine((l, ctx) => {
    const e = catalog[l.exerciseId];
    if (!e) return;
    const expected =
      e.load === "band" ? "lb" : e.load === "bodyweight" ? "bodyweight" : "kg";
    if (l.unit !== expected)
      ctx.addIssue({
        code: "custom",
        message: "Load unit does not match exercise.",
      });
    if (e.unilateral && l.side === "both")
      ctx.addIssue({
        code: "custom",
        message: "Record unilateral exercises separately for left and right.",
      });
  });
export const sessionSchema = z.object({
  id: z.string(),
  planId: z.string(),
  name: z.string().max(120),
  date,
  startedAt: z.string(),
  status: z.enum(["active", "paused", "completed", "abandoned"]),
  elapsed: n.max(31536000),
  lastResumedAt: n.nullable(),
  logs: z.array(log).max(1000),
  exercises: z.array(planned).max(100),
  notes: z.string().max(5000),
  recovery: z.enum(["good", "poor"]),
  source: z.string().optional(),
  durationUnknown: z.boolean().optional(),
});
export const dataSchema = z.object({
  version: z.literal(1),
  onboarded: z.boolean(),
  name: z.string().min(1).max(60),
  goals: z.array(z.string()).max(10),
  experience: z.string(),
  equipment: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100),
        type: z.enum([
          "Dumbbells",
          "Bench",
          "Kettlebell",
          "Resistance bands",
          "Bodyweight",
        ]),
        available: z.boolean(),
        weights: z.array(n.max(500)).max(100),
        quantity: n.int().max(100),
        min: n.optional(),
        max: n.optional(),
        increment: n.optional(),
        angles: z.string().optional(),
      }),
    )
    .max(100),
  plans: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100),
        subtitle: z.string().max(200),
        day: n.int().max(6),
        minutes: n.int().min(5).max(180),
        exercises: z
          .array(planned)
          .max(50)
          .refine(
            (items) =>
              new Set(items.map((p) => p.exerciseId)).size === items.length,
            "Each exercise may appear once per workout; increase its sets instead.",
          ),
      }),
    )
    .max(20),
  sessions: z.array(sessionSchema).max(20000),
  measurements: z.array(
    z.object({
      id: z.string(),
      date,
      weight: n.max(500).optional(),
      waist: n.max(300).optional(),
      biceps: n.max(150).optional(),
      chest: n.max(300).optional(),
      thigh: n.max(200).optional(),
    }),
  ),
  autoRest: z.boolean(),
  trainingProfile: z
    .object({
      age: n.int().min(18).max(100),
      heightCm: n.min(120).max(230),
      weightKg: n.min(30).max(300),
      limitations: z.string().max(1000),
    })
    .optional(),
  program: z
    .object({
      startDate: date,
      weeks: z.union([z.literal(12), z.literal(24)]),
      phase: z.union([z.literal(1), z.literal(2), z.literal(3)]),
      lastReviewed: date,
    })
    .optional(),
});
