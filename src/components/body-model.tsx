"use client";
import { useId } from "react";
import type { Exercise } from "@/lib/types";
export type Point = [number, number];
export type BodyPose = {
  head: Point;
  neck: Point;
  hip: Point;
  elbow: Point;
  hand: Point;
  knee: Point;
  foot: Point;
  elbow2?: Point;
  hand2?: Point;
  knee2?: Point;
  foot2?: Point;
  bench?: number[];
};
const add = (p: Point, x: number, y: number): Point => [p[0] + x, p[1] + y];

/** Original shaded vector mannequin. Far limbs are drawn first for readable depth. */
export function BodyModel({
  pose: p,
  exercise,
  progress = 0,
}: {
  pose: BodyPose;
  exercise: Exercise;
  progress?: number;
}) {
  const id = useId().replaceAll(":", "");
  const facingRight = [
    "squat",
    "kbsquat",
    "bandsquat",
    "bwsquat",
    "lunge",
    "split",
    "hinge",
    "walk",
  ].includes(exercise.pose);
  const skin = `url(#${id}-skin)`,
    shirt = `url(#${id}-shirt)`,
    pants = `url(#${id}-pants)`,
    metal = `url(#${id}-metal)`;
  const shoulder = add(p.neck, 3, 3),
    farShoulder = add(p.neck, -5, 0);
  const farElbow = p.elbow2 ?? add(p.elbow, -12, -3),
    farHand = p.hand2 ?? add(p.hand, -12, -3);
  const farKnee = p.knee2 ?? add(p.knee, -9, -3),
    farFoot = p.foot2 ?? add(p.foot, -9, -3);
  const segment = (a: Point, b: Point, width: number, fill: string) => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
    return (
      <g transform={`translate(${a.join(",")}) rotate(${angle})`}>
        <path
          d={`M0 ${-width / 2} Q${length * 0.55} ${-width * 0.62} ${length} ${-width * 0.34} A${width * 0.34} ${width * 0.34} 0 0 1 ${length} ${width * 0.34} Q${length * 0.55} ${width * 0.54} 0 ${width / 2} A${width / 2} ${width / 2} 0 0 1 0 ${-width / 2}`}
          fill={fill}
        />
        <path
          d={`M2 ${-width * 0.26}L${Math.max(2, length - 3)} ${-width * 0.19}`}
          stroke="white"
          strokeOpacity=".17"
          strokeWidth="1.1"
          strokeLinecap="round"
        />
      </g>
    );
  };
  const shoe = (foot: Point, far: boolean) => {
    const heelLift = exercise.pose === "calf" ? progress * 8 : 0;
    return (
      <g
        data-part={far ? "far-foot" : "near-foot"}
        transform={`translate(${foot.join(",")}) rotate(${heelLift ? heelLift * 3 : 0},-10,${heelLift}) scale(${facingRight ? -1 : 1},1)`}
      >
        <path
          d="M-3-4Q1-5 4-1L5 4Q-3 7-14 5L-15 2Q-14-1-7-1Z"
          fill={far ? "#71849f" : "#dbe8fa"}
          stroke="#415b7d"
          strokeWidth=".7"
        />
        <path
          d="M-14 4Q-3 6 5 3"
          fill="none"
          stroke={far ? "#3a4c69" : "#6a8cbb"}
          strokeWidth="1.7"
        />
        <path d="M-6 0L0 1M-7 2L-1 3" stroke="#6f8caf" strokeWidth=".8" />
      </g>
    );
  };
  const hand = (point: Point, elbow: Point, far: boolean) => {
    const angle =
      (Math.atan2(point[1] - elbow[1], point[0] - elbow[0]) * 180) / Math.PI;
    return (
      <g
        data-part={far ? "far-hand" : "near-hand"}
        transform={`translate(${point.join(",")}) rotate(${angle})`}
      >
        <ellipse cx="1" rx="5" ry="3.3" fill={skin} />
        <ellipse cx="0" cy="-2.5" rx="2.8" ry="1.4" fill="#efc8a7" />
        <path d="M3-1V1M5-1V1" stroke="#af795b" strokeWidth=".5" />
      </g>
    );
  };
  const weight = (point: Point, far = false) => {
    if (!["dumbbell", "kettlebell"].includes(exercise.load)) return null;
    return (
      <g
        data-part="weight"
        transform={`translate(${point.join(",")})`}
        opacity={far ? 0.8 : 1}
      >
        {exercise.load === "kettlebell" ? (
          <>
            <path
              d="M-4 3V-3Q0-9 4-3V3"
              fill="none"
              stroke="#94abc7"
              strokeWidth="2.6"
            />
            <ellipse cy="8" rx="8" ry="8.5" fill={metal} />
            <path
              d="M-4 5Q-5 10-2 12"
              stroke="#a6bee0"
              fill="none"
              strokeWidth="1.3"
            />
          </>
        ) : (
          <>
            <rect
              x="-12"
              y="-1.8"
              width="24"
              height="3.6"
              rx="1.8"
              fill="#c2d4ee"
            />
            {[-12, 8].map((x) => (
              <g key={x}>
                <rect
                  x={x}
                  y="-6.5"
                  width="5"
                  height="13"
                  rx="1.8"
                  fill={metal}
                  stroke="#91aed1"
                  strokeWidth=".6"
                />
                <path d={`M${x + 1}-5V4`} stroke="#a7c6ee" strokeWidth=".8" />
              </g>
            ))}
          </>
        )}
      </g>
    );
  };
  const leg = (hip: Point, knee: Point, foot: Point, far = false) => (
    <g opacity={far ? 0.76 : 1}>
      {segment(hip, knee, 13, pants)}
      <circle cx={knee[0]} cy={knee[1]} r="4.8" fill={pants} />
      {segment(knee, foot, 8.5, skin)}
      {shoe(foot, far)}
    </g>
  );
  const arm = (s: Point, e: Point, h: Point, far = false) => (
    <g opacity={far ? 0.72 : 1}>
      {segment(s, e, 9.5, skin)}
      <circle cx={e[0]} cy={e[1]} r="3.8" fill={skin} />
      {segment(e, h, 7.2, skin)}
      {hand(h, e, far)}
      {(!far || exercise.count === 2) && weight(h, far)}
    </g>
  );
  const torsoLength = Math.hypot(p.hip[0] - p.neck[0], p.hip[1] - p.neck[1]);
  const torsoAngle =
    (Math.atan2(p.hip[1] - p.neck[1], p.hip[0] - p.neck[0]) * 180) / Math.PI -
    90;
  return (
    <g className="body-model" data-renderer="shaded-mannequin">
      <defs>
        <linearGradient id={`${id}-skin`} x1="0" y1="0" x2="0.95" y2="0.65">
          <stop stopColor="#ffe0bd" />
          <stop offset=".4" stopColor="#dfb08a" />
          <stop offset="1" stopColor="#8c5d45" />
        </linearGradient>
        <linearGradient id={`${id}-shirt`}>
          <stop stopColor="#18396c" />
          <stop offset=".35" stopColor="#3d86f0" />
          <stop offset=".65" stopColor="#68a9ff" />
          <stop offset="1" stopColor="#234c88" />
        </linearGradient>
        <linearGradient id={`${id}-pants`}>
          <stop stopColor="#26354e" />
          <stop offset=".45" stopColor="#5d769d" />
          <stop offset="1" stopColor="#1a2b46" />
        </linearGradient>
        <linearGradient id={`${id}-metal`}>
          <stop stopColor="#192d48" />
          <stop offset=".4" stopColor="#667e9e" />
          <stop offset=".6" stopColor="#405b80" />
          <stop offset="1" stopColor="#15243b" />
        </linearGradient>
        <radialGradient id={`${id}-head`} cx=".3" cy=".25" r=".8">
          <stop stopColor="#ffe4c5" />
          <stop offset=".55" stopColor="#e2b18b" />
          <stop offset="1" stopColor="#9e6a4b" />
        </radialGradient>
      </defs>
      {p.bench && (
        <g>
          <path
            d={`M${p.bench[0] + 8} ${p.bench[1] + 3}V142M${p.bench[2] - 7} ${p.bench[3] + 3}V142`}
            stroke="#40526c"
            strokeWidth="5"
          />
          <path
            d={`M${p.bench[0]} ${p.bench[1] + 4}L${p.bench[2]} ${p.bench[3] + 4}`}
            stroke="#111e30"
            strokeWidth="11"
            strokeLinecap="round"
          />
          <path
            d={`M${p.bench[0]} ${p.bench[1]}L${p.bench[2]} ${p.bench[3]}`}
            stroke="#6a83a4"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </g>
      )}
      {leg(add(p.hip, -4, 0), farKnee, farFoot, true)}
      {arm(farShoulder, farElbow, farHand, true)}
      {exercise.load === "band" &&
        [p.hand, farHand].map((h, i) => (
          <path
            key={i}
            d={`M${exercise.pose === "pulldown" ? "120 -10" : exercise.pose === "bandrow" ? "170 50" : (i ? farFoot : p.foot).join(" ")}L${h.join(" ")}`}
            stroke="#f3b35c"
            strokeWidth="1.8"
            fill="none"
          />
        ))}
      {exercise.pose === "mobility" ? (
        <path
          d={`M${p.neck.join(" ")}Q76 ${70 + progress * 36} ${p.hip.join(" ")}`}
          stroke={shirt}
          strokeWidth="17"
          strokeLinecap="round"
          fill="none"
        />
      ) : (
        <g transform={`translate(${p.neck.join(",")}) rotate(${torsoAngle})`}>
          <path
            d={`M-9 0Q0-6 10 0L12 10Q10 ${torsoLength * 0.65} 8 ${torsoLength}Q0 ${torsoLength + 5}-9 ${torsoLength}L-12 12Z`}
            fill={shirt}
          />
          <path
            d={`M-7 7Q-6 ${torsoLength * 0.6}-5 ${torsoLength - 3}`}
            stroke="#9dcbff"
            strokeOpacity=".3"
            strokeWidth="1.4"
            fill="none"
          />
          <path
            d={`M-9 ${torsoLength - 3}Q0 ${torsoLength + 1}9 ${torsoLength - 3}`}
            stroke="#152640"
            strokeWidth="3"
            fill="none"
          />
          <path
            d="M-5 0Q0 6 5 0"
            stroke="#152c50"
            strokeWidth="2"
            fill="none"
          />
        </g>
      )}
      {leg(add(p.hip, 3, 1), p.knee, p.foot)}
      {segment(add(p.neck, 0, 1), add(p.head, 1, 7), 7, skin)}
      <g
        transform={`translate(${p.head.join(",")}) scale(${facingRight ? -1 : 1},1)`}
      >
        <ellipse rx="9" ry="11" fill={`url(#${id}-head)`} />
        <path d="M-8-1L-11 2-8 4" fill="#e7bb95" />
        <ellipse cx="4" cy="2" rx="2" ry="3" fill="#bd8b68" />
        <path
          d="M-6-3L-3-3"
          stroke="#644b42"
          strokeWidth="1"
          strokeLinecap="round"
        />
        <path d="M-7 6L-4 6" stroke="#a5755b" strokeWidth=".7" />
      </g>
      {arm(shoulder, p.elbow, p.hand)}
    </g>
  );
}
