import { describe, it, expect } from "vitest";
import { catalog, freshData, exercises } from "../src/lib/catalog";
import { motionRig } from "../src/lib/motion-rig";
import {
  programPlans,
  programWeek,
  phaseReadiness,
  weeklyMuscleSets,
} from "../src/lib/program";
import { dataSchema } from "../src/lib/validation";
describe("3D movement geometry", () => {
  it("has finite positions for every catalogue movement throughout a repetition", () => {
    for (const e of exercises)
      for (const t of [0, 0.25, 0.5, 0.75, 1])
        for (const p of Object.values(motionRig(e, t))) {
          if (Array.isArray(p)) {
            expect(p).toHaveLength(3);
            expect(p.every(Number.isFinite)).toBe(true);
          }
        }
  });
  it("curls move both hands through an arc without moving elbows or feet", () => {
    const start = motionRig(catalog.curl, 0),
      end = motionRig(catalog.curl, 1);
    expect(start.lh).not.toEqual(end.lh);
    expect(start.rh).not.toEqual(end.rh);
    expect(start.le).toEqual(end.le);
    expect(start.re).toEqual(end.re);
    expect(start.lf).toEqual(end.lf);
    expect(start.rf).toEqual(end.rf);
    for (const t of [0, 0.25, 0.5, 1]) {
      const p = motionRig(catalog.curl, t);
      expect(Math.hypot(...p.lh.map((v, i) => v - p.le[i]))).toBeCloseTo(0.31);
    }
  });
  it("reverse lunges lift the stepping foot and keep the other planted", () => {
    const start = motionRig(catalog.lunge, 0),
      mid = motionRig(catalog.lunge, 0.5),
      end = motionRig(catalog.lunge, 1);
    expect(mid.lf).toEqual(start.lf);
    expect(mid.rf[1]).toBeGreaterThan(start.rf[1]);
    expect(end.rf[2]).toBeLessThan(start.rf[2]);
  });
});
describe("phased program", () => {
  it("starts conservatively and includes chest, legs, biceps and core", () => {
    const d = freshData();
    const plans = programPlans(d, 1);
    expect(plans.map((p) => p.day)).toEqual([3, 5, 0]);
    expect(plans.flatMap((p) => p.exercises).every((e) => e.sets === 2)).toBe(
      true,
    );
    expect(weeklyMuscleSets(plans)).toMatchObject({
      Chest: 6,
      Biceps: 6,
      Abs: 6,
      Quadriceps: 4,
      Hamstrings: 4,
      Back: 4,
    });
    expect(d.sessions).toHaveLength(0);
  });
  it("adds targeted volume without assuming new loads or growing endlessly", () => {
    const d = freshData();
    const p2 = programPlans(d, 2),
      p3 = programPlans(d, 3);
    expect(weeklyMuscleSets(p2)).toMatchObject({
      Chest: 9,
      Back: 6,
      Biceps: 6,
      Abs: 6,
    });
    expect(weeklyMuscleSets(p3)).toEqual(weeklyMuscleSets(p2));
    expect(
      p2.flatMap((p) => p.exercises).every((p) => p.weight === undefined),
    ).toBe(true);
  });
  it("preserves chosen weekdays and supports a lighter week", () => {
    const d = freshData();
    d.plans[0].day = 2;
    expect(programPlans(d, 2)[0].day).toBe(2);
    expect(
      programPlans(d, 3, true)
        .flatMap((p) => p.exercises)
        .every((p) => p.sets === 1),
    ).toBe(true);
  });
  it("does not infer readiness from calendar time alone", () => {
    expect(phaseReadiness(freshData()).ready).toBe(false);
    expect(programWeek("2026-11-21", "2026-12-19")).toBe(5);
  });
  it("keeps old saved states valid and validates optional program profiles", () => {
    expect(dataSchema.safeParse(freshData()).success).toBe(true);
    expect(
      dataSchema.safeParse({
        ...freshData(),
        trainingProfile: {
          age: 27,
          heightCm: 172.7,
          weightKg: 65,
          limitations: "None",
        },
        program: {
          startDate: "2026-11-21",
          weeks: 24,
          phase: 1,
          lastReviewed: "2026-11-21",
        },
      }).success,
    ).toBe(true);
  });
});
