import type { AppData, Plan } from "./types";
import { catalog } from "./catalog";
import { adaptPlan, shiftDate, today } from "./engine";
export const phases = [
  {
    id: 1 as const,
    title: "Learn & establish",
    range: "Weeks 1–4",
    description:
      "Two controlled sets per movement. Learn technique and finish most sets with 2–3 good repetitions left.",
    milestone:
      "Build a repeatable routine and record a baseline for each exercise.",
  },
  {
    id: 2 as const,
    title: "Build strength & muscle",
    range: "Weeks 5–8",
    description:
      "If recovery and technique are good, add one set to chest, back and main leg exercises. Keep direct arm and core work at two sets.",
    milestone:
      "Look for more controlled reps or a higher confirmed load—not a promised change in appearance.",
  },
  {
    id: 3 as const,
    title: "Consolidate & reassess",
    range: "Weeks 9–12 · repeat through week 24",
    description:
      "Keep the productive volume. Progress reps before load; use slower lowering or unilateral movements when your dumbbells become too light.",
    milestone:
      "Review strength, waist, body weight and consistency every four weeks. Adjust from your actual results.",
  },
];
export function programWeek(start: string, date = today()) {
  return Math.max(
    1,
    Math.floor(
      (Date.parse(date + "T12:00:00Z") - Date.parse(start + "T12:00:00Z")) /
        604800000,
    ) + 1,
  );
}
export function programPlans(
  data: AppData,
  phase: 1 | 2 | 3,
  light = false,
): Plan[] {
  const specs = [
    {
      id: "a",
      name: "Strength A",
      subtitle: "Chest, back, thighs, biceps & abs",
      day: 3,
      ids: ["bench", "row", "goblet", "curl", "crunch", "calf"],
    },
    {
      id: "b",
      name: "Strength B",
      subtitle: "Upper chest, hamstrings, shoulders & core",
      day: 5,
      ids: ["incline", "rdl", "shoulder", "row", "hammer", "deadbug"],
    },
    {
      id: "c",
      name: "Strength C",
      subtitle: "Chest, legs, biceps & core",
      day: 0,
      ids: ["pushup", "split", "rdl", "curl", "plank"],
    },
  ];
  return specs.map((spec) =>
    adaptPlan(
      {
        id: spec.id,
        name: spec.name,
        subtitle: spec.subtitle,
        day: data.plans.find((p) => p.id === spec.id)?.day ?? spec.day,
        minutes: light ? 30 : phase === 1 ? 40 : 50,
        exercises: spec.ids.map((id, i) => {
          const e = catalog[id];
          const extra =
            phase > 1 &&
            ["Chest", "Back", "Quadriceps", "Hamstrings"].includes(e.primary);
          const existing = data.plans
            .flatMap((p) => p.exercises)
            .find((p) => p.exerciseId === id);
          return {
            id: `${spec.id}-${i}`,
            exerciseId: id,
            sets: light ? 1 : extra ? 3 : 2,
            min: e.kind === "seconds" ? 20 : 8,
            max: e.kind === "seconds" ? 40 : e.primary === "Calves" ? 15 : 12,
            rest: [
              "Chest",
              "Back",
              "Quadriceps",
              "Hamstrings",
              "Shoulders",
            ].includes(e.primary)
              ? 90
              : 60,
            ...(existing?.weight !== undefined && !light
              ? { weight: existing.weight }
              : {}),
          };
        }),
      },
      data.equipment,
    ),
  );
}
export function phaseReadiness(data: AppData) {
  const recent = data.sessions.filter(
    (s) => s.status === "completed" && s.date >= shiftDate(today(), -27),
  );
  const concerns = recent
    .filter((s) => s.date >= shiftDate(today(), -6))
    .some(
      (s) =>
        s.recovery === "poor" || s.logs.some((l) => l.pain || !l.technique),
    );
  return {
    sessions: recent.length,
    ready: recent.length >= 8 && !concerns,
    reason: concerns
      ? "Recent pain, poor recovery or technique concerns: repeat or lighten the phase rather than adding sets."
      : recent.length < 8
        ? "Build consistency first. Aim for at least 8 completed sessions in four weeks before adding volume."
        : "Your recent records support reviewing the next phase. Confirm that recovery and technique still feel good.",
  };
}
export function weeklyMuscleSets(plans: Plan[]) {
  const totals: Record<string, number> = {};
  for (const plan of plans)
    for (const p of plan.exercises) {
      const m = catalog[p.exerciseId].primary;
      totals[m] = (totals[m] ?? 0) + p.sets;
    }
  return totals;
}
