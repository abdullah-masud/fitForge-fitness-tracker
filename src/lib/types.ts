export type Gear =
  "Dumbbells" | "Bench" | "Kettlebell" | "Resistance bands" | "Bodyweight";
export type Muscle =
  | "Chest"
  | "Biceps"
  | "Triceps"
  | "Shoulders"
  | "Back"
  | "Abs"
  | "Quadriceps"
  | "Hamstrings"
  | "Glutes"
  | "Calves"
  | "Full body";
export type Exercise = {
  id: string;
  name: string;
  primary: Muscle;
  secondary: Muscle[];
  gear: Gear[];
  kind: "reps" | "seconds";
  load: "dumbbell" | "kettlebell" | "band" | "bodyweight";
  count: number;
  unilateral: boolean;
  pose: string;
  steps: string[];
  mistake: string;
  breath: string;
  safety: string;
  easy: string;
  hard: string;
};
export type Planned = {
  id: string;
  exerciseId: string;
  sets: number;
  min: number;
  max: number;
  rest: number;
  weight?: number;
};
export type Plan = {
  id: string;
  name: string;
  subtitle: string;
  day: number;
  minutes: number;
  exercises: Planned[];
};
export type Equipment = {
  id: string;
  name: string;
  type: Gear;
  available: boolean;
  weights: number[];
  quantity: number;
  min?: number;
  max?: number;
  increment?: number;
  angles?: string;
};
export type SetLog = {
  id: string;
  exerciseId: string;
  set: number;
  side: "both" | "left" | "right";
  reps: number | null;
  repRange?: string;
  seconds?: number;
  weight: number;
  unit: "kg" | "lb" | "bodyweight";
  difficulty: "Easy" | "Moderate" | "Hard";
  rir: number | null;
  pain: boolean;
  technique: boolean;
  notes: string;
};
export type Session = {
  id: string;
  planId: string;
  name: string;
  date: string;
  startedAt: string;
  status: "active" | "paused" | "completed" | "abandoned";
  elapsed: number;
  lastResumedAt: number | null;
  logs: SetLog[];
  exercises: Planned[];
  notes: string;
  recovery: "good" | "poor";
  source?: string;
  durationUnknown?: boolean;
};
export type Measurement = {
  id: string;
  date: string;
  weight?: number;
  waist?: number;
  biceps?: number;
  chest?: number;
  thigh?: number;
};
export type AppData = {
  version: 1;
  onboarded: boolean;
  name: string;
  goals: string[];
  experience: string;
  equipment: Equipment[];
  plans: Plan[];
  sessions: Session[];
  measurements: Measurement[];
  autoRest: boolean;
  trainingProfile?: {
    age: number;
    heightCm: number;
    weightKg: number;
    limitations: string;
  };
  program?: {
    startDate: string;
    weeks: 12 | 24;
    phase: 1 | 2 | 3;
    lastReviewed: string;
  };
};
