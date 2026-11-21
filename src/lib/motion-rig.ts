import type { Exercise } from "./types";
export type V3 = [number, number, number];
export type Rig = {
  head: V3;
  chest: V3;
  hip: V3;
  ls: V3;
  rs: V3;
  le: V3;
  re: V3;
  lh: V3;
  rh: V3;
  lk: V3;
  rk: V3;
  lf: V3;
  rf: V3;
  bench: boolean;
  floor: boolean;
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const lerp3 = (a: V3, b: V3, t: number): V3 =>
  a.map((v, i) => mix(v, b[i], t)) as V3;
/** Two-segment inverse kinematics keeps the elbow between shoulder and wrist. */
function joint(a: V3, b: V3, bend: V3, len = 0.32): V3 {
  const d = b.map((v, i) => v - a[i]) as V3;
  const dist = Math.max(0.001, Math.hypot(...d));
  const u = d.map((v) => v / dist);
  const projection = bend.reduce((n, v, i) => n + v * u[i], 0);
  let n = bend.map((v, i) => v - projection * u[i]);
  const m = Math.hypot(...n) || 1;
  n = n.map((v) => v / m);
  const h = Math.sqrt(
    Math.max(0, len * len - (Math.min(dist, len * 2) / 2) ** 2),
  );
  return a.map((v, i) => v + d[i] / 2 + n[i] * h) as V3;
}
export function motionRig(exercise: Exercise, t: number): Rig {
  const k = exercise.pose;
  const p: Rig = {
    head: [0, 1.76, 0],
    chest: [0, 1.45, 0],
    hip: [0, 0.99, 0],
    ls: [-0.22, 1.48, 0],
    rs: [0.22, 1.48, 0],
    le: [-0.27, 1.17, 0],
    re: [0.27, 1.17, 0],
    lh: [-0.28, 0.86, 0.02],
    rh: [0.28, 0.86, 0.02],
    lk: [-0.14, 0.54, 0.025],
    rk: [0.14, 0.54, 0.025],
    lf: [-0.14, 0.09, 0],
    rf: [0.14, 0.09, 0],
    bench: false,
    floor: false,
  };
  const arms = (
    hands: [V3, V3],
    bend: [V3, V3] = [
      [-1, 0, 0],
      [1, 0, 0],
    ],
  ) => {
    p.lh = hands[0];
    p.rh = hands[1];
    p.le = joint(p.ls, p.lh, bend[0]);
    p.re = joint(p.rs, p.rh, bend[1]);
  };
  const lower = (amount: number) => {
    for (const key of [
      "head",
      "chest",
      "hip",
      "ls",
      "rs",
      "le",
      "re",
      "lh",
      "rh",
    ] as const)
      p[key] = [p[key][0], p[key][1] - amount, p[key][2]];
  };
  if (["curl", "hammer", "bandcurl", "bandhammer"].includes(k)) {
    const angle = t * 2.25;
    for (const side of ["l", "r"] as const) {
      const e = p[`${side}e`];
      p[`${side}h`] = [
        e[0],
        e[1] - 0.31 * Math.cos(angle),
        e[2] + 0.31 * Math.sin(angle),
      ];
    }
  } else if (["squat", "kbsquat", "bandsquat", "bwsquat"].includes(k)) {
    lower(0.4 * t);
    p.hip[2] = -0.19 * t;
    p.chest[2] = 0.07 * t;
    p.head[2] = 0.12 * t;
    p.ls[2] = p.rs[2] = 0.07 * t;
    p.lk = [-0.22, 0.54 - 0.13 * t, 0.23 * t];
    p.rk = [0.22, 0.54 - 0.13 * t, 0.23 * t];
    p.lf = [-0.24, 0.09, 0];
    p.rf = [0.24, 0.09, 0];
    arms(
      [
        [-0.1, 1.28 - 0.4 * t, 0.22],
        [0.1, 1.28 - 0.4 * t, 0.22],
      ],
      [
        [-1, 0, 0],
        [1, 0, 0],
      ],
    );
  } else if (k === "hinge") {
    const angle = t * 1.0;
    p.hip = [0, 0.99 - 0.08 * t, -0.2 * t];
    p.chest = [
      0,
      p.hip[1] + 0.46 * Math.cos(angle),
      p.hip[2] + 0.46 * Math.sin(angle),
    ];
    p.head = [
      0,
      p.chest[1] + 0.27 * Math.cos(angle),
      p.chest[2] + 0.27 * Math.sin(angle),
    ];
    p.ls = [-0.22, p.chest[1] + 0.03, p.chest[2]];
    p.rs = [0.22, p.chest[1] + 0.03, p.chest[2]];
    p.lk = [-0.14, 0.51, 0.08 * t];
    p.rk = [0.14, 0.51, 0.08 * t];
    arms([
      [-0.25, p.ls[1] - 0.61, p.ls[2]],
      [0.25, p.rs[1] - 0.61, p.rs[2]],
    ]);
  } else if (k === "lunge" || k === "split") {
    lower(0.38 * t);
    p.lf = [-0.16, 0.09, 0.27];
    p.rf = [
      0.16,
      0.09 + (k === "lunge" ? 0.13 * Math.sin(t * Math.PI) : 0),
      k === "lunge" ? mix(0.22, -0.53, t) : -0.53,
    ];
    p.lk = [-0.16, 0.54 - 0.12 * t, 0.32];
    p.rk = [0.16, 0.54 - 0.34 * t, -0.22 * t];
    p.hip[2] = -0.02;
    p.chest[2] = -0.02;
  } else if (["bench", "incline", "floor"].includes(k)) {
    p.bench = k !== "floor";
    p.floor = k === "floor";
    const y = k === "floor" ? 0.19 : 0.67;
    const slope = k === "incline" ? 0.23 : 0;
    p.hip = [0, y, 0.15];
    p.chest = [0, y + slope, -0.3];
    p.head = [0, y + slope + 0.04, -0.6];
    p.ls = [-0.22, y + slope, -0.34];
    p.rs = [0.22, y + slope, -0.34];
    p.lk = [-0.2, 0.46, 0.49];
    p.rk = [0.2, 0.46, 0.49];
    p.lf = [-0.2, 0.09, 0.69];
    p.rf = [0.2, 0.09, 0.69];
    arms(
      [
        [mix(-0.4, -0.19, t), y + slope + mix(0.13, 0.6, t), -0.3],
        [mix(0.4, 0.19, t), y + slope + mix(0.13, 0.6, t), -0.3],
      ],
      [
        [-1, -0.7, 0.2],
        [1, -0.7, 0.2],
      ],
    );
  } else if (k === "press") {
    p.bench = true;
    lower(0.36);
    p.lk = [-0.18, 0.54, 0.3];
    p.rk = [0.18, 0.54, 0.3];
    p.lf = [-0.18, 0.09, 0.36];
    p.rf = [0.18, 0.09, 0.36];
    arms(
      [
        [mix(-0.43, -0.2, t), mix(1.29, 1.71, t), 0.06],
        [mix(0.43, 0.2, t), mix(1.29, 1.71, t), 0.06],
      ],
      [
        [-1, -0.3, 0],
        [1, -0.3, 0],
      ],
    );
  } else if (k === "tricep") {
    p.le = [-0.12, 1.75, 0];
    p.re = [0.12, 1.75, 0];
    const a = mix(-1.05, 1.35, t);
    p.lh = [-0.055, 1.75 + 0.3 * Math.sin(a), -0.3 * Math.cos(a)];
    p.rh = [0.055, p.lh[1], p.lh[2]];
  } else if (k === "row") {
    p.bench = true;
    p.hip = [0.1, 1.03, 0.2];
    p.chest = [0.05, 1.1, -0.26];
    p.head = [0.05, 1.17, -0.53];
    p.ls = [-0.17, 1.1, -0.3];
    p.rs = [0.27, 1.1, -0.3];
    p.lh = [-0.18, 0.66, -0.43];
    p.le = joint(p.ls, p.lh, [-1, 0, 0]);
    p.rh = [0.31, mix(0.5, 0.97, t), mix(-0.25, 0.11, t)];
    p.re = joint(p.rs, p.rh, [0.4, 0.1, 1]);
    p.lk = [-0.13, 0.68, 0.27];
    p.lf = [-0.13, 0.68, 0.58];
    p.rk = [0.33, 0.55, 0.35];
    p.rf = [0.33, 0.09, 0.52];
  } else if (["pushup", "inclinepush", "plank"].includes(k)) {
    const incline = k === "inclinepush";
    const h =
      k === "plank" ? 0.36 : incline ? mix(1.1, 0.84, t) : mix(0.66, 0.31, t);
    p.bench = incline;
    p.floor = !incline;
    p.chest = [0, h, -0.35];
    p.hip = [0, mix(h, 0.17, 0.38), 0.15];
    p.head = [0, h + 0.04, -0.61];
    p.ls = [-0.23, h, -0.39];
    p.rs = [0.23, h, -0.39];
    p.lf = [-0.14, 0.09, 0.88];
    p.rf = [0.14, 0.09, 0.88];
    p.lk = lerp3(p.hip, p.lf, 0.55);
    p.rk = lerp3(p.hip, p.rf, 0.55);
    p.lh = [-0.28, incline ? 0.66 : 0.1, -0.41];
    p.rh = [0.28, incline ? 0.66 : 0.1, -0.41];
    p.le = joint(p.ls, p.lh, [-1, 0, 0.6]);
    p.re = joint(p.rs, p.rh, [1, 0, 0.6]);
    if (k === "plank") {
      p.le = [-0.23, 0.1, -0.2];
      p.re = [0.23, 0.1, -0.2];
      p.lh = [-0.23, 0.1, -0.51];
      p.rh = [0.23, 0.1, -0.51];
    }
  } else if (k === "crunch" || k === "deadbug") {
    p.floor = true;
    p.hip = [0, 0.18 + (k === "crunch" ? 0.09 * t : 0), 0.1];
    p.chest = [0, 0.19, -0.35];
    p.head = [0, 0.22, -0.65];
    p.ls = [-0.22, 0.19, -0.39];
    p.rs = [0.22, 0.19, -0.39];
    p.lk = [-0.14, 0.59, 0.1 - 0.12 * t];
    p.rk = [0.14, 0.59, 0.1 - 0.12 * t];
    p.lf = [-0.14, 0.59, 0.52 - 0.15 * t];
    p.rf = [0.14, 0.59, 0.52 - 0.15 * t];
    p.lh = [-0.3, 0.1, 0.05];
    p.rh = [0.3, 0.1, 0.05];
    p.le = joint(p.ls, p.lh, [-1, 0, 0]);
    p.re = joint(p.rs, p.rh, [1, 0, 0]);
    if (k === "deadbug") {
      p.rk = lerp3([0.14, 0.59, 0.1], [0.14, 0.28, 0.46], t);
      p.rf = lerp3([0.14, 0.59, 0.52], [0.14, 0.15, 0.91], t);
      p.lh = lerp3([-0.22, 0.8, -0.39], [-0.22, 0.2, -0.98], t);
      p.rh = [0.22, 0.8, -0.39];
      p.le = joint(p.ls, p.lh, [-1, 0, 0]);
      p.re = joint(p.rs, p.rh, [1, 0, 0]);
    }
  } else if (k === "calf") {
    for (const key of Object.keys(p) as (keyof Rig)[]) {
      const v = p[key];
      if (Array.isArray(v)) v[1] += 0.09 * t;
    }
  } else if (k === "bandrow") {
    arms(
      [
        [-0.23, 1.24, mix(0.59, 0.14, t)],
        [0.23, 1.24, mix(0.59, 0.14, t)],
      ],
      [
        [-1, 0, -0.5],
        [1, 0, -0.5],
      ],
    );
  } else if (k === "pulldown") {
    lower(0.45);
    p.lk = [-0.16, 0.09, 0.05];
    p.rk = [0.16, 0.09, 0.05];
    p.lf = [-0.16, 0.09, -0.4];
    p.rf = [0.16, 0.09, -0.4];
    arms(
      [
        [mix(-0.25, -0.39, t), mix(1.58, 1.02, t), 0.09],
        [mix(0.25, 0.39, t), mix(1.58, 1.02, t), 0.09],
      ],
      [
        [-1, 0, 0],
        [1, 0, 0],
      ],
    );
  } else if (k === "walk") {
    const swing = (t - 0.5) * 0.7;
    p.lf = [-0.15, 0.09 + Math.max(0, Math.sin(t * Math.PI)) * 0.08, swing];
    p.rf = [0.15, 0.09, -swing];
    p.lk = lerp3([-0.14, 0.99, 0], p.lf, 0.52);
    p.rk = lerp3([0.14, 0.99, 0], p.rf, 0.52);
    p.lh = [-0.28, 0.9, -swing];
    p.rh = [0.28, 0.9, swing];
    p.le = joint(p.ls, p.lh, [-1, 0, 0]);
    p.re = joint(p.rs, p.rh, [1, 0, 0]);
  } else if (k === "mobility") {
    p.floor = true;
    p.chest = [0, 0.67, -0.25];
    p.hip = [0, 0.66, 0.26];
    p.head = [0, mix(0.65, 0.85, t), -0.55];
    p.ls = [-0.22, 0.67, -0.28];
    p.rs = [0.22, 0.67, -0.28];
    p.lh = [-0.22, 0.09, -0.29];
    p.rh = [0.22, 0.09, -0.29];
    p.le = lerp3(p.ls, p.lh, 0.5);
    p.re = lerp3(p.rs, p.rh, 0.5);
    p.lk = [-0.15, 0.09, 0.28];
    p.rk = [0.15, 0.09, 0.28];
    p.lf = [-0.15, 0.09, 0.7];
    p.rf = [0.15, 0.09, 0.7];
  }
  return p;
}
export function movementHint(exercise: Exercise) {
  const k = exercise.pose;
  if (["curl", "hammer", "bandcurl", "bandhammer"].includes(k))
    return "Keep elbows beside your ribs. Both hands curl up, then lower. Feet stay planted.";
  if (["bench", "incline", "floor"].includes(k))
    return "Both hands press above the chest. Keep wrists over elbows; lower with control.";
  if (["lunge", "split"].includes(k))
    return "The front foot stays planted. Lower through both knees; complete both sides.";
  if (k === "row")
    return "One hand supports you. The other pulls toward the hip. Repeat on the other side.";
  if (k === "deadbug")
    return "Extend the opposite arm and leg while keeping your lower back controlled. Alternate sides.";
  return exercise.steps[1];
}
