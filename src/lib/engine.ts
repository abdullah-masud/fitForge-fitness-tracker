import { catalog, exercises } from "./catalog";
import type {
  AppData,
  Equipment,
  Exercise,
  Plan,
  Session,
  SetLog,
  Planned,
} from "./types";
export const today = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Perth",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export const dayOf = (date: string) =>
  new Date(date + "T12:00:00+08:00").getUTCDay();
export function shiftDate(date: string, n: number) {
  const d = new Date(date + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
export function week(date = today()) {
  const offset = (dayOf(date) + 6) % 7;
  return Array.from({ length: 7 }, (_, i) => shiftDate(date, i - offset));
}
export function schedule(plans: Plan[], date = today()) {
  return Array.from({ length: 14 }, (_, i) => {
    const dateKey = shiftDate(date, i);
    return {
      date: dateKey,
      plans: plans.filter((p) => p.day === dayOf(dateKey)),
    };
  });
}
export function available(e: Exercise, equipment: Equipment[]) {
  return e.gear.every(
    (g) =>
      g === "Bodyweight" ||
      equipment.some(
        (q) =>
          q.available &&
          q.type === g &&
          q.quantity >= (g === "Dumbbells" ? e.count : 1),
      ),
  );
}
export function alternatives(e: Exercise, equipment: Equipment[]) {
  return exercises.filter(
    (x) => x.id !== e.id && x.primary === e.primary && available(x, equipment),
  );
}
export function adaptPlan(plan: Plan, equipment: Equipment[]): Plan {
  return {
    ...plan,
    exercises: plan.exercises.map((p) =>
      available(catalog[p.exerciseId], equipment)
        ? p
        : {
            ...p,
            exerciseId:
              alternatives(catalog[p.exerciseId], equipment)[0]?.id ??
              p.exerciseId,
            weight: undefined,
          },
    ),
  };
}
export function volume(log: SetLog) {
  const e = catalog[log.exerciseId];
  return e &&
    log.unit === "kg" &&
    (e.load === "dumbbell" || e.load === "kettlebell") &&
    log.reps !== null
    ? log.weight * log.reps * e.count
    : 0;
}
export function totals(sessions: Session[]) {
  const completed = sessions.filter((s) => s.status === "completed");
  const logs = completed.flatMap((s) => s.logs);
  return {
    workouts: completed.length,
    sets: logs.length,
    reps: logs.reduce((n, l) => n + (l.reps ?? 0), 0),
    unknown: logs.filter((l) => l.reps === null && !l.seconds).length,
    seconds: completed.reduce((n, s) => n + s.elapsed, 0),
    volume: logs.reduce((n, l) => n + volume(l), 0),
  };
}
export function elapsed(s: Session) {
  return (
    s.elapsed +
    (s.status === "active" && s.lastResumedAt
      ? Math.max(0, Math.floor((Date.now() - s.lastResumedAt) / 1000))
      : 0)
  );
}
export function streak(sessions: Session[], date = today()) {
  const completed = sessions.filter((s) => s.status === "completed");
  let count = 0;
  let monday = week(date)[0];
  if (
    !completed.some((s) => s.date >= monday && s.date <= shiftDate(monday, 6))
  )
    monday = shiftDate(monday, -7);
  for (let i = 0; i < 520; i++) {
    if (
      !completed.some((s) => s.date >= monday && s.date <= shiftDate(monday, 6))
    )
      break;
    count++;
    monday = shiftDate(monday, -7);
  }
  return count;
}
export function records(sessions: Session[]) {
  const result: Record<
    string,
    { weight: number; reps: number; date: string; unit: string }
  > = {};
  for (const s of sessions
    .filter((s) => s.status === "completed")
    .sort((a, b) => a.date.localeCompare(b.date))) {
    for (const l of s.logs) {
      if (l.reps === null || l.unit === "bodyweight") continue;
      const old = result[l.exerciseId];
      if (
        !old ||
        l.weight > old.weight ||
        (l.weight === old.weight && l.reps > old.reps)
      )
        result[l.exerciseId] = {
          weight: l.weight,
          reps: l.reps,
          date: s.date,
          unit: l.unit,
        };
    }
  }
  return result;
}
export function recommendation(
  p: Planned,
  data: AppData,
): { text: string; weight?: number } {
  const e = catalog[p.exerciseId];
  const sessions = data.sessions
    .filter(
      (s) =>
        s.status === "completed" && s.logs.some((l) => l.exerciseId === e.id),
    )
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt),
    );
  const last = sessions[0];
  if (!last)
    return {
      text: "Start light. Choose resistance you can control for the target range with about 2–3 reps left. Confirm your exact available weights in Equipment.",
    };
  const logs = last.logs.filter((l) => l.exerciseId === e.id);
  if (last.recovery === "poor" || logs.some((l) => l.pain))
    return {
      text: logs.some((l) => l.pain)
        ? "Stop the provoking exercise. Choose a pain-free alternative; seek qualified advice for sharp or persistent pain."
        : "Recovery was poor. Take a recovery day or reduce sets and resistance.",
    };
  if (logs.some((l) => l.difficulty === "Hard" || !l.technique))
    return {
      text: "Keep or reduce resistance. Prioritize comfortable technique and finish with repetitions in reserve.",
    };
  const weight = logs[0].weight;
  const top =
    sessions.slice(0, 2).length === 2 &&
    sessions.slice(0, 2).every((s) => {
      const ls = s.logs.filter((l) => l.exerciseId === e.id);
      return (
        ls.length >= p.sets * (e.unilateral ? 2 : 1) &&
        ls.every(
          (l) =>
            (l.reps ?? 0) >= p.max &&
            (l.rir ?? -1) >= 2 &&
            l.technique &&
            !l.pain &&
            l.weight === weight,
        )
      );
    });
  if (top && e.load !== "bodyweight") {
    const gear = data.equipment.find(
      (q) => q.available && q.type === e.gear.find((g) => g !== "Bench"),
    );
    const next = gear?.weights
      .filter((w) => w > weight)
      .sort((a, b) => a - b)[0];
    if (next && weight > 0 && next / weight <= 1.15)
      return {
        text: `Two sessions reached the top of the range with good technique and ≥2 reps in reserve. Consider ${next}${e.load === "band" ? " lb nominal" : " kg" + (e.load === "dumbbell" ? " per dumbbell" : "")}. Confirm before applying; no increase is guaranteed safe.`,
        weight: next,
      };
    return {
      text: "You reached the top of the range twice. The next load is unconfirmed or a large jump: refine technique or use a slower lowering phase before adding weight.",
    };
  }
  return {
    text: `Build toward ${p.max} ${e.kind === "seconds" ? "seconds" : "reps"} at your current resistance. A load increase needs two consistent sessions with good technique and ≥2 reps in reserve.`,
  };
}
export function coach(data: AppData, question: string) {
  const completed = data.sessions.filter((s) => s.status === "completed");
  const recent = completed.filter((s) => s.date >= shiftDate(today(), -6));
  const muscles = new Set(
    recent.flatMap((s) => s.logs.map((l) => catalog[l.exerciseId]?.primary)),
  );
  switch (question) {
    case "today": {
      const p = data.plans.filter((p) => p.day === dayOf(today()));
      return p.length
        ? `Today: ${p.map((x) => x.name).join(", ")}. Train ${[...new Set(p.flatMap((x) => x.exercises.map((e) => catalog[e.exerciseId].primary)))].join(", ")}. Warm up gently first.`
        : "Today is a recovery day. Try a comfortable walk and gentle mobility. Your next strength session can wait.";
    }
    case "weight":
      return "Choose a light resistance you can control for 8–12 repetitions with 2–3 reps left. Exact dumbbell combinations must be confirmed in Equipment; no starting load is assumed.";
    case "increase":
      return "Reach the top of your rep range with good technique and at least 2 reps left in two sessions. Review an exercise’s recommendation and explicitly confirm any available weight increase.";
    case "legs":
      return muscles.has("Quadriceps") || muscles.has("Hamstrings")
        ? `Your last 7 days include leg training across ${recent.length} completed sessions. Keep both a squat/lunge and a hip hinge in your weekly plan.`
        : "No leg training is recorded in the last 7 days. Keep squat/lunge and hip-hinge movements in your plan alongside arms and chest.";
    case "biceps": {
      const days = new Set(
        recent
          .filter((s) =>
            s.logs.some((l) => catalog[l.exerciseId]?.primary === "Biceps"),
          )
          .map((s) => s.date),
      ).size;
      return `${days} biceps training days recorded in the last 7 days. ${days > 3 ? "Consider reducing direct arm work and leaving recovery days between sessions." : "Allow recovery between hard arm sessions; rows also train biceps."}`;
    }
    case "sore":
      return "For ordinary soreness, use easy walking or lighter work and reassess recovery. Stop an exercise that causes sharp pain or persistent discomfort; seek qualified advice rather than pushing through.";
    default: {
      const current = totals(
        completed.filter((s) => s.date >= shiftDate(today(), -29)),
      );
      const previous = totals(
        completed.filter(
          (s) =>
            s.date >= shiftDate(today(), -59) &&
            s.date < shiftDate(today(), -29),
        ),
      );
      return `Last 30 days: ${current.workouts} completed workouts and ${current.sets} logged sets. Previous 30 days: ${previous.workouts} workouts and ${previous.sets} sets. ${!previous.workouts ? "More recorded history is needed for a meaningful comparison." : "Compare the same exercise, load and technique to judge strength changes."}`;
    }
  }
}
