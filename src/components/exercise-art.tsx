"use client";
import { useEffect, useRef, useState } from "react";
import { Play, Pause, RotateCcw } from "lucide-react";
import { Button } from "./ui/button";
import { BodyModel } from "./body-model";
import type { Exercise } from "@/lib/types";
type P = [number, number];
type Pose = {
  head: P;
  neck: P;
  hip: P;
  elbow: P;
  hand: P;
  knee: P;
  foot: P;
  elbow2?: P;
  hand2?: P;
  knee2?: P;
  foot2?: P;
  bench?: number[];
};
function pose(kind: string, end: boolean): Pose {
  const stand: Pose = {
    head: [65, 25],
    neck: [65, 40],
    hip: [65, 83],
    elbow: [76, 63],
    hand: [78, 89],
    knee: [57, 109],
    foot: [52, 139],
    knee2: [76, 109],
    foot2: [82, 139],
  };
  if (["curl", "hammer", "bandcurl", "bandhammer"].includes(kind))
    return { ...stand, hand: end ? [57, 45] : [78, 89], elbow: [78, 65] };
  if (["squat", "kbsquat", "bandsquat", "bwsquat"].includes(kind))
    return end
      ? {
          head: [75, 52],
          neck: [71, 65],
          hip: [47, 92],
          elbow: [85, 78],
          hand: [80, 59],
          knee: [89, 102],
          foot: [78, 139],
          knee2: [67, 109],
          foot2: [56, 139],
        }
      : { ...stand, elbow: [82, 59], hand: [72, 45] };
  if (kind === "lunge" && !end)
    return {
      ...stand,
      head: [83, 25],
      neck: [83, 40],
      hip: [83, 83],
      elbow: [94, 63],
      hand: [96, 89],
      knee: [89, 109],
      foot: [92, 139],
      knee2: [76, 109],
      foot2: [76, 139],
    };
  if (["lunge", "split"].includes(kind))
    return {
      ...stand,
      head: [64, end ? 48 : 25],
      neck: [64, end ? 63 : 40],
      hip: [64, end ? 99 : 83],
      elbow: [76, end ? 82 : 63],
      hand: [78, end ? 108 : 89],
      knee: [90, end ? 105 : 108],
      foot: [92, 139],
      knee2: [37, end ? 132 : 108],
      foot2: [22, 139],
    };
  if (["bench", "incline", "floor"].includes(kind)) {
    const incline = kind === "incline";
    return {
      head: [35, incline ? 67 : 92],
      neck: [49, incline ? 78 : 96],
      hip: [94, 101],
      elbow: [61, end ? 56 : 97],
      hand: [62, end ? 28 : 67],
      knee: [117, 105],
      foot: [127, 139],
      bench: kind === "floor" ? undefined : [25, incline ? 83 : 109, 100, 109],
    };
  }
  if (kind === "row")
    return {
      head: [45, 53],
      neck: [59, 61],
      hip: [104, 72],
      elbow: [72, end ? 67 : 89],
      hand: [90, end ? 70 : 115],
      elbow2: [48, 84],
      hand2: [39, 108],
      knee: [101, 105],
      foot: [122, 139],
      knee2: [84, 106],
      foot2: [66, 107],
      bench: [25, 115, 100, 115],
    };
  if (kind === "hinge")
    return end
      ? {
          ...stand,
          head: [101, 60],
          neck: [87, 69],
          hip: [51, 82],
          elbow: [90, 93],
          hand: [90, 118],
          knee: [65, 109],
          foot: [63, 139],
        }
      : stand;
  if (kind === "press")
    return {
      ...stand,
      elbow: [90, end ? 37 : 58],
      hand: [82, end ? 8 : 28],
      hip: [65, 88],
      knee: [92, 98],
      foot: [96, 139],
      bench: [46, 96, 85, 96],
    };
  if (kind === "tricep")
    return { ...stand, elbow: [67, 10], hand: end ? [66, 0] : [45, 34] };
  if (kind === "calf")
    return {
      ...stand,
      head: [65, end ? 17 : 25],
      neck: [65, end ? 32 : 40],
      hip: [65, end ? 75 : 83],
      elbow: [76, end ? 55 : 63],
      hand: [78, end ? 81 : 89],
      knee: [57, end ? 101 : 109],
      foot: [52, end ? 131 : 139],
      knee2: [76, end ? 101 : 109],
      foot2: [82, end ? 131 : 139],
    };
  if (["plank", "pushup", "inclinepush"].includes(kind)) {
    const y =
      kind === "inclinepush"
        ? end
          ? 80
          : 60
        : kind === "pushup" && end
          ? 105
          : 78;
    return {
      head: [31, y - 10],
      neck: [46, y],
      hip: [91, y + 15],
      elbow: [40, kind === "plank" ? 128 : y + 23],
      hand: [22, kind === "inclinepush" ? 94 : 139],
      knee: [116, kind === "inclinepush" ? 114 : y + 28],
      foot: [143, 139],
      bench: kind === "inclinepush" ? [8, 101, 48, 101] : undefined,
    };
  }
  if (kind === "crunch")
    return {
      head: [27, 126],
      neck: [41, 130],
      hip: [88, end ? 111 : 130],
      elbow: [58, 136],
      hand: [82, 138],
      knee: [end ? 72 : 104, 88],
      foot: [end ? 102 : 134, 93],
    };
  if (kind === "deadbug")
    return {
      head: [27, 126],
      neck: [41, 130],
      hip: [88, 130],
      elbow: [49, end ? 115 : 102],
      hand: [end ? 17 : 50, end ? 98 : 76],
      knee: [end ? 116 : 90, end ? 120 : 96],
      foot: [end ? 145 : 119, end ? 132 : 96],
      elbow2: [57, 105],
      hand2: [59, 76],
      knee2: [85, 93],
      foot2: [113, 93],
    };
  if (kind === "bandrow")
    return { ...stand, elbow: [end ? 48 : 90, 61], hand: [end ? 76 : 116, 58] };
  if (kind === "pulldown")
    return {
      ...stand,
      elbow: [88, end ? 67 : 29],
      hand: [90, end ? 44 : 5],
      hip: [65, 100],
      knee: [81, 136],
      foot: [112, 139],
    };
  if (kind === "walk")
    return {
      ...stand,
      elbow: [end ? 84 : 47, 61],
      hand: [end ? 98 : 35, 81],
      knee: [end ? 47 : 82, 110],
      foot: [end ? 30 : 98, 139],
      knee2: [end ? 82 : 47, 110],
      foot2: [end ? 98 : 30, 139],
    };
  if (kind === "mobility")
    return {
      head: [33, end ? 77 : 98],
      neck: [47, 90],
      hip: [105, 90],
      elbow: [45, 116],
      hand: [44, 139],
      knee: [107, 137],
      foot: [139, 139],
    };
  return stand;
}
function blend(a: P, b: P, t: number): P {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
}
function tween(a: Pose, b: Pose, t: number): Pose {
  const p = { ...a };
  for (const k of [
    "head",
    "neck",
    "hip",
    "elbow",
    "hand",
    "knee",
    "foot",
    "elbow2",
    "hand2",
    "knee2",
    "foot2",
  ] as const) {
    if (a[k] && b[k]) p[k] = blend(a[k]!, b[k]!, t);
  }
  // A fixed elbow rotates the forearm through an arc rather than shortening it.
  if (a.elbow[0] === b.elbow[0] && a.elbow[1] === b.elbow[1]) {
    const start = Math.atan2(a.hand[1] - a.elbow[1], a.hand[0] - a.elbow[0]);
    const end = Math.atan2(b.hand[1] - b.elbow[1], b.hand[0] - b.elbow[0]);
    const delta = Math.atan2(Math.sin(end - start), Math.cos(end - start));
    const radius =
      Math.hypot(a.hand[0] - a.elbow[0], a.hand[1] - a.elbow[1]) * (1 - t) +
      Math.hypot(b.hand[0] - b.elbow[0], b.hand[1] - b.elbow[1]) * t;
    p.hand = [
      p.elbow[0] + Math.cos(start + delta * t) * radius,
      p.elbow[1] + Math.sin(start + delta * t) * radius,
    ];
  }
  return p;
}
function movementPose(exercise: Exercise, t: number) {
  const p = tween(pose(exercise.pose, false), pose(exercise.pose, true), t);
  if (exercise.pose === "lunge" && p.foot2)
    p.foot2 = [p.foot2[0], p.foot2[1] - Math.sin(t * Math.PI) * 13];
  return p;
}

/** One isolated player per visible guide. Animation never writes workout data. */
export function ExerciseAnimation({ exercise }: { exercise: Exercise }) {
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [paths, setPaths] = useState(true);
  const [phase, setPhase] = useState(0);
  const cursor = useRef(0);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPlaying(!media.matches);
    const change = () => {
      if (media.matches) setPlaying(false);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    let previous = 0;
    let rendered = 0;
    const run = (now: number) => {
      if (previous && document.visibilityState === "visible")
        cursor.current =
          (cursor.current + (Math.min(now - previous, 60) * speed) / 6000) % 1;
      previous = now;
      if (now - rendered > 32) {
        setPhase(cursor.current);
        rendered = now;
      }
      frame = requestAnimationFrame(run);
    };
    frame = requestAnimationFrame(run);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);
  const hold = exercise.id === "plank";
  const progress = (1 - Math.cos(phase * Math.PI * 2)) / 2;
  const p = movementPose(exercise, hold ? 0 : progress);
  const step = phase < 0.12 || phase > 0.88 ? 0 : phase < 0.5 ? 1 : 2;
  return (
    <section
      className="movement-player"
      aria-label={`${exercise.name} animated demonstration`}
    >
      <div className="movement-top">
        <span className="eyebrow">WATCH THE MOVEMENT</span>
        <span className="movement-phase">
          {hold
            ? "Hold steady · keep breathing"
            : phase < 0.12
              ? "Starting position"
              : phase < 0.5
                ? "Move slowly"
                : "Return with control"}
        </span>
      </div>
      <svg
        className="movement-stage"
        viewBox="-26 -22 218 190"
        role="img"
        aria-label={`${exercise.name}, ${hold ? "stationary hold" : Math.round(progress * 100) + " percent through the movement"}`}
      >
        <defs>
          <radialGradient id={`floor-${exercise.id}`}>
            <stop stopColor="#385578" />
            <stop offset="1" stopColor="#142034" />
          </radialGradient>
          <marker
            id={`arrow-${exercise.id}`}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto-start-reverse"
          >
            <path d="M0 0L10 5L0 10Z" fill="#69dfb3" />
          </marker>
        </defs>
        <ellipse
          cx="81"
          cy="145"
          rx="96"
          ry="15"
          fill={`url(#floor-${exercise.id})`}
        />
        <path
          d="M-10 145H178M17 158L62 130M72 160L101 131M127 158L142 133"
          stroke="#4b6382"
          strokeOpacity=".22"
          strokeWidth=".5"
        />
        {paths &&
          !hold &&
          (["hand", "foot", "foot2"] as const).map((part) => {
            if (part === "foot2" && !p.foot2) return null;
            const points = Array.from(
              { length: 17 },
              (_, i) => movementPose(exercise, i / 16)[part]!,
            );
            const length = Math.hypot(
              points[0][0] - points[16][0],
              points[0][1] - points[16][1],
            );
            return length > 5 ? (
              <polyline
                key={part}
                data-motion-path={part}
                points={points.map((v) => v.join(",")).join(" ")}
                fill="none"
                stroke="#69dfb3"
                strokeWidth="1.3"
                strokeDasharray="2.5 2.5"
                opacity=".8"
                markerEnd={`url(#arrow-${exercise.id})`}
              />
            ) : null;
          })}
        <BodyModel pose={p} exercise={exercise} progress={progress} />
        {hold && (
          <circle
            cx="162"
            cy="30"
            r={10 + progress * 4}
            stroke="#65dbb0"
            strokeWidth="1.5"
            fill="#65dbb016"
          />
        )}
      </svg>
      <div className="movement-legend">
        <span>
          <i /> Hands & feet are shown separately
        </span>
        <label>
          <input
            type="checkbox"
            checked={paths}
            onChange={(e) => setPaths(e.target.checked)}
          />{" "}
          Movement path
        </label>
      </div>
      <div className="movement-controls">
        <Button
          variant="outline"
          size="sm"
          aria-label={playing ? "Pause demonstration" : "Play demonstration"}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
          {playing ? "Pause" : "Play"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Restart demonstration"
          onClick={() => {
            cursor.current = 0;
            setPhase(0);
          }}
        >
          <RotateCcw size={16} />
        </Button>
        <label className="speed-label">
          Speed
          <select
            aria-label="Demonstration speed"
            value={speed}
            onChange={(e) => setSpeed(+e.target.value)}
          >
            <option value={0.5}>Slow · 0.5×</option>
            <option value={1}>Normal · 1×</option>
          </select>
        </label>
      </div>
      <input
        className="movement-scrubber"
        type="range"
        min="0"
        max="1000"
        value={Math.round(phase * 1000)}
        aria-label="Scrub demonstration"
        onChange={(e) => {
          setPlaying(false);
          cursor.current = +e.target.value / 1000;
          setPhase(cursor.current);
        }}
      />
      <div className="movement-cue">
        <span>{hold ? "HOLD" : `0${step + 1}`}</span>
        <p>
          {hold
            ? "Brace gently, keep a straight body, and breathe steadily."
            : exercise.steps[Math.min(step, exercise.steps.length - 1)]}
        </p>
      </div>
      <p className="movement-note">
        {exercise.unilateral ? "Repeat on both sides. " : ""}Shaded 3D-style
        guide ·{" "}
        {exercise.load === "dumbbell" && exercise.count === 2
          ? "use two dumbbells as described below."
          : "follow the form cues below."}
      </p>
    </section>
  );
}
export function ExerciseArt({
  exercise,
  compact = false,
}: {
  exercise: Exercise;
  compact?: boolean;
}) {
  return (
    <div
      className={`exercise-art ${compact ? "compact" : ""}`}
      role="img"
      aria-label={`${exercise.name}: starting position and ${exercise.kind === "seconds" ? "hold" : "finishing position"}. Schematic; follow the written technique cues.`}
    >
      {[false, true].map((end, i) => {
        const p = pose(exercise.pose, end);
        return (
          <div key={i}>
            <svg viewBox="0 -8 165 166" aria-hidden="true">
              <ellipse cx="82" cy="145" rx="76" ry="5" fill="#26374e" />
              <BodyModel pose={p} exercise={exercise} progress={end ? 1 : 0} />
            </svg>
            {!compact && (
              <span>
                {i === 0
                  ? "01 · START"
                  : exercise.kind === "seconds"
                    ? "02 · HOLD"
                    : "02 · FINISH"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
