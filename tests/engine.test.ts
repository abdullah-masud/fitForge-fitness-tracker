import { describe, it, expect } from "vitest";
import { freshData, catalog, initialPlans } from "../src/lib/catalog";
import {
  available,
  adaptPlan,
  dayOf,
  week,
  schedule,
  totals,
  volume,
  recommendation,
  streak,
  today,
} from "../src/lib/engine";
import { historicalSessions, importHistorical } from "../src/lib/imports";
import { dataSchema } from "../src/lib/validation";
import type { SetLog, Session } from "../src/lib/types";
const log: SetLog = {
  id: "l",
  exerciseId: "curl",
  set: 1,
  side: "both",
  reps: 12,
  weight: 4,
  unit: "kg",
  difficulty: "Moderate",
  rir: 2,
  pain: false,
  technique: true,
  notes: "",
};
const session = (id: string, date: string): Session => ({
  id,
  planId: "a",
  name: "Strength A",
  date,
  startedAt: date + "T12:00:00+08:00",
  status: "completed",
  elapsed: 1200,
  lastResumedAt: null,
  logs: [
    { ...log, id: id + "1" },
    { ...log, id: id + "2", set: 2 },
  ],
  exercises: [],
  notes: "",
  recovery: "good",
});
describe("load semantics", () => {
  it("counts both dumbbells for bilateral curls", () =>
    expect(volume(log)).toBe(96));
  it("counts only one dumbbell in each one-arm row", () =>
    expect(volume({ ...log, exerciseId: "row", side: "left" })).toBe(48));
  it("counts two held dumbbells during each side of a split squat", () =>
    expect(volume({ ...log, exerciseId: "split", side: "right" })).toBe(96));
  it("never converts bands or bodyweight into weighted volume", () => {
    expect(volume({ ...log, exerciseId: "bands-curl", unit: "lb" })).toBe(0);
    expect(volume({ ...log, exerciseId: "pushup", unit: "bodyweight" })).toBe(
      0,
    );
  });
  it("excludes unknown repetitions", () =>
    expect(volume({ ...log, reps: null, repRange: "10–12" })).toBe(0));
});
describe("completion accounting", () => {
  it("ignores active, paused and abandoned sessions", () => {
    const s = session("a", "2026-11-18");
    expect(
      totals([
        s,
        { ...s, id: "b", status: "active" },
        { ...s, id: "c", status: "paused" },
        { ...s, id: "d", status: "abandoned" },
      ]),
    ).toMatchObject({
      workouts: 1,
      sets: 2,
      reps: 24,
      seconds: 1200,
      volume: 192,
    });
  });
  it("does not invent historical totals", () => {
    const t = totals(historicalSessions());
    expect(t.workouts).toBe(2);
    expect(t.unknown).toBe(4);
    expect(t.seconds).toBe(0);
    expect(t.volume).toBe(0);
    expect(t.reps).toBe(246);
  });
  it("counts weekly consistency streaks in Perth weeks", () =>
    expect(
      streak(
        [session("a", "2026-11-18"), session("b", "2026-11-11")],
        "2026-11-21",
      ),
    ).toBe(2));
});
describe("equipment", () => {
  it("does not assume dumbbell increments", () =>
    expect(freshData().equipment[0].weights).toEqual([]));
  it("requires two dumbbells for two-dumbbell exercises", () => {
    const gear = freshData().equipment.map((g) =>
      g.id === "db" ? { ...g, quantity: 1 } : g,
    );
    expect(available(catalog.curl, gear)).toBe(false);
    expect(available(catalog.goblet, gear)).toBe(true);
  });
  it("replaces unavailable bench press with floor press if bench removed", () => {
    const gear = freshData().equipment.map((g) =>
      g.type === "Bench" ? { ...g, available: false } : g,
    );
    const result = adaptPlan(initialPlans[0], gear);
    expect(result.exercises[0].exerciseId).not.toBe("bench");
    expect(available(catalog[result.exercises[0].exerciseId], gear)).toBe(true);
  });
});
describe("Perth scheduling", () => {
  it("rolls date forward at UTC+8 midnight", () =>
    expect(today(new Date("2026-11-20T16:01:00Z"))).toBe("2026-11-21"));
  it("uses Wednesday Friday Sunday", () => {
    expect(dayOf("2026-11-18")).toBe(3);
    expect(schedule(initialPlans, "2026-11-18")[0].plans[0].id).toBe("a");
    expect(schedule(initialPlans, "2026-11-21")[0].plans).toHaveLength(0);
  });
  it("creates Monday-first week across year boundary", () =>
    expect(week("2027-01-01")).toEqual([
      "2026-12-28",
      "2026-12-29",
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
      "2027-01-03",
    ]));
});
describe("explainable progression", () => {
  const p = { id: "p", exerciseId: "curl", sets: 2, min: 8, max: 12, rest: 75 };
  it("needs real history", () =>
    expect(recommendation(p, freshData()).weight).toBeUndefined());
  it("requires two successful sessions and known available load", () => {
    const d = freshData();
    d.equipment[0].weights = [4, 4.5, 6];
    d.sessions = [session("a", "2026-11-11"), session("b", "2026-11-18")];
    expect(recommendation(p, d).weight).toBe(4.5);
    expect(d.plans[0].exercises[3].weight).toBeUndefined();
  });
  it("does not recommend a large jump", () => {
    const d = freshData();
    d.equipment[0].weights = [4, 6];
    d.sessions = [session("a", "2026-11-11"), session("b", "2026-11-18")];
    expect(recommendation(p, d).weight).toBeUndefined();
    expect(recommendation(p, d).text).toContain("large jump");
  });
  it("pain overrides progression", () => {
    const d = freshData();
    const s = session("a", "2026-11-18");
    s.logs[0].pain = true;
    d.sessions = [s];
    expect(recommendation(p, d).text).toContain("Stop");
    expect(recommendation(p, d).weight).toBeUndefined();
  });
  it("missing RIR or poor technique prevents a load recommendation", () => {
    const d = freshData();
    d.equipment[0].weights = [4, 4.5];
    d.sessions = [session("a", "2026-11-11"), session("b", "2026-11-18")];
    d.sessions[1].logs[0].rir = null;
    expect(recommendation(p, d).weight).toBeUndefined();
  });
});
describe("historical imports and validation", () => {
  it("only imports on explicit function call and is idempotent", () => {
    const d = freshData();
    expect(d.sessions).toHaveLength(0);
    expect(importHistorical(importHistorical([]))).toHaveLength(2);
  });
  it("preserves unknown ranges and pain", () => {
    const s = historicalSessions();
    expect(s[1].logs.find((l) => l.exerciseId === "bands-curl")).toMatchObject({
      reps: null,
      repRange: "12–15",
      unit: "lb",
    });
    expect(s[0].logs.find((l) => l.exerciseId === "bands-squat")?.pain).toBe(
      true,
    );
  });
  it("logs left and right separately", () =>
    expect(
      historicalSessions()[1]
        .logs.filter((l) => l.exerciseId === "lunge")
        .map((l) => l.side),
    ).toEqual(["left", "right", "left", "right"]));
  it("validates default and imported states; rejects corrupt data", () => {
    expect(
      dataSchema.safeParse({ ...freshData(), sessions: historicalSessions() })
        .success,
    ).toBe(true);
    expect(dataSchema.safeParse({ ...freshData(), name: "" }).success).toBe(
      false,
    );
  });
});
