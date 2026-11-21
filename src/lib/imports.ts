import type { Session, SetLog } from "./types";
type Entry = [string, number, number, number | string, string?];
function make(date: string, entries: Entry[], notes: string): Session {
  const logs: SetLog[] = [];
  for (const [exerciseId, weight, sets, reps, unilateral] of entries) {
    for (let i = 0; i < sets; i++) {
      const sides: SetLog["side"][] = unilateral ? ["left", "right"] : ["both"];
      for (const side of sides)
        logs.push({
          id: `${date}-${exerciseId}-${i}-${side}`,
          exerciseId,
          set: i + 1,
          side,
          weight,
          unit: weight ? "lb" : "bodyweight",
          reps: typeof reps === "number" ? reps : null,
          ...(typeof reps === "string" ? { repRange: reps } : {}),
          difficulty: "Moderate",
          rir: null,
          pain: exerciseId === "bands-squat",
          technique: false,
          notes:
            exerciseId === "bands-squat"
              ? "Band under foot caused discomfort."
              : "",
        });
    }
  }
  return {
    id: `history-${date}`,
    source: `provided-${date}`,
    planId: "import",
    name: "Imported home workout",
    date,
    startedAt: date + "T12:00:00+08:00",
    status: "completed",
    elapsed: 0,
    durationUnknown: true,
    lastResumedAt: null,
    exercises: [],
    notes,
    recovery: "good",
    logs,
  };
}
export function historicalSessions(): Session[] {
  return [
    make(
      "2026-11-04",
      [
        ["bands-curl", 10, 2, 20],
        ["bands-squat", 20, 2, 12],
        ["bands-row", 20, 2, 12],
        ["crunch", 0, 2, 12],
        ["incline-pushup", 0, 2, 10],
      ],
      "Band under foot caused discomfort during squats. Duration and technique were not recorded.",
    ),
    make(
      "2026-11-06",
      [
        ["bands-row", 20, 2, 12],
        ["bands-pull", 10, 2, 12],
        ["bands-curl", 10, 2, "12–15"],
        ["bands-hammer", 10, 2, "10–12"],
        ["crunch", 0, 2, 12],
        ["lunge", 0, 2, 8, "each"],
        ["pushup", 0, 1, 10],
      ],
      "Exact reps for curls and hammer curls are unknown; original ranges preserved. Duration and technique were not recorded.",
    ),
  ];
}
export function importHistorical(existing: Session[]) {
  return [
    ...existing,
    ...historicalSessions().filter(
      (s) => !existing.some((e) => e.id === s.id || e.source === s.source),
    ),
  ];
}
