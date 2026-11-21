"use client";
import { useEffect, useState } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Check,
  ArrowRight,
  Clock,
  Info,
} from "lucide-react";
import { useApp } from "./provider";
import { Button } from "./ui/button";
import { catalog } from "@/lib/catalog";
import { elapsed, recommendation, totals, available } from "@/lib/engine";
import type { Session, SetLog, Plan } from "@/lib/types";
import { ExerciseAnimation } from "./exercise-player";
import { Field, Guide, minutes, Empty } from "./common";
export function Workout({
  start,
}: {
  start: (p: Plan, light?: boolean) => void;
}) {
  const { data, update } = useApp();
  const session = data.sessions.find(
    (s) => s.status === "active" || s.status === "paused",
  );
  const [index, setIndex] = useState(0);
  const [guide, setGuide] = useState(false);
  const [summary, setSummary] = useState<Session | null>(null);
  const [, tick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => tick((v) => v + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const patch = (fn: (s: Session) => Session) => {
    if (session)
      return update((d) => ({
        ...d,
        sessions: d.sessions.map((s) => (s.id === session.id ? fn(s) : s)),
      }));
  };
  if (summary) {
    const t = totals([summary]);
    const previous = data.sessions
      .filter(
        (s) =>
          s.status === "completed" &&
          s.id !== summary.id &&
          s.planId === summary.planId,
      )
      .sort((a, b) => b.startedAt.localeCompare(a.startedAt))[0];
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow green-text">YOU SHOWED UP. THAT MATTERS.</p>
            <h1>Workout complete.</h1>
            <p className="muted">One session closer to your stronger self.</p>
          </div>
        </div>
        <div className="card summary">
          <div className="success-icon">
            <Check size={38} />
          </div>
          <h2>{summary.name}</h2>
          <div className="stats-grid">
            <div>
              <strong>
                {new Set(summary.logs.map((l) => l.exerciseId)).size}
              </strong>
              <small>Exercises</small>
            </div>
            <div>
              <strong>{t.sets}</strong>
              <small>Sets</small>
            </div>
            <div>
              <strong>{t.reps}</strong>
              <small>Reps</small>
            </div>
            <div>
              <strong>{minutes(t.seconds)}</strong>
              <small>Time</small>
            </div>
          </div>
          <p>
            {Math.round(t.volume)} kg-reps of known external load volume (bands
            and bodyweight excluded).
          </p>
          <div className="chips">
            {[
              ...new Set(
                summary.logs.map((l) => catalog[l.exerciseId].primary),
              ),
            ].map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
          <p className="muted">
            {previous
              ? `${t.sets - totals([previous]).sets >= 0 ? "+" : ""}${t.sets - totals([previous]).sets} sets compared with your previous ${summary.name}.`
              : "Your baseline is set. Your next session will have something real to build on."}
          </p>
          {summary.exercises.slice(0, 2).map((p) => (
            <p className="notice" key={p.id}>
              <strong>{catalog[p.exerciseId].name}: </strong>
              {recommendation(p, data).text}
            </p>
          ))}
          <Button onClick={() => setSummary(null)}>
            Done <ArrowRight size={17} />
          </Button>
        </div>
      </>
    );
  }
  if (!session)
    return (
      <>
        <div className="page-heading">
          <div>
            <p className="eyebrow">YOUR TIME. YOUR TRAINING.</p>
            <h1>
              Let’s get moving<span className="blue">.</span>
            </h1>
            <p className="muted">
              Choose a session when you’re ready. Your work saves as you go.
            </p>
          </div>
        </div>
        <div className="plan-grid">
          {data.plans.map((p) => (
            <section className="card" key={p.id}>
              <h2>{p.name}</h2>
              <p className="muted">{p.subtitle}</p>
              <p>
                {p.exercises.length} exercises · {p.minutes} minutes
              </p>
              <div className="row">
                <Button
                  disabled={!p.exercises.length}
                  onClick={() => {
                    setIndex(0);
                    start(p);
                  }}
                >
                  <Play size={16} /> Start workout
                </Button>
                <Button
                  variant="outline"
                  disabled={!p.exercises.length}
                  onClick={() => {
                    setIndex(0);
                    start(p, true);
                  }}
                >
                  Lighter session
                </Button>
              </div>
            </section>
          ))}
        </div>
      </>
    );
  const currentIndex = Math.min(index, session.exercises.length - 1);
  const p = session.exercises[currentIndex];
  if (!p)
    return (
      <Empty title="No exercises in this session">
        <Button
          onClick={() =>
            patch((s) => ({ ...s, status: "abandoned", lastResumedAt: null }))
          }
        >
          Close empty session
        </Button>
      </Empty>
    );
  const exercise = catalog[p.exerciseId];
  const rec = recommendation(p, data);
  const logs = session.logs.filter((l) => l.exerciseId === p.exerciseId);
  const last = data.sessions
    .filter(
      (s) =>
        s.status === "completed" &&
        s.logs.some((l) => l.exerciseId === p.exerciseId),
    )
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const targetSets = session.exercises.reduce(
    (n, x) => n + x.sets * (catalog[x.exerciseId].unilateral ? 2 : 1),
    0,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            LIVE SESSION ·{" "}
            {session.status === "paused" ? "PAUSED" : "IN YOUR ELEMENT"}
          </p>
          <h1>
            {session.name}
            <span className="blue">.</span>
          </h1>
          <p className="muted">
            {session.logs.length} / {targetSets} side-specific sets recorded ·
            Autosaved on this device
          </p>
        </div>
        <div className="row">
          <span className="date-pill">
            <Clock size={16} />
            {minutes(elapsed(session))}
          </span>
          <Button
            variant="outline"
            onClick={() =>
              patch((s) => ({
                ...s,
                elapsed: elapsed(s),
                status: s.status === "active" ? "paused" : "active",
                lastResumedAt: s.status === "active" ? null : Date.now(),
              }))
            }
          >
            {session.status === "active" ? (
              <Pause size={16} />
            ) : (
              <Play size={16} />
            )}{" "}
            {session.status === "active" ? "Pause" : "Resume"}
          </Button>
        </div>
      </div>
      <div className="workout-layout">
        <aside className="card workout-list">
          {session.exercises.map((x, i) => {
            const done =
              session.logs.filter((l) => l.exerciseId === x.exerciseId)
                .length >=
              x.sets * (catalog[x.exerciseId].unilateral ? 2 : 1);
            return (
              <button
                key={x.id}
                className={i === currentIndex ? "selected" : ""}
                onClick={() => setIndex(i)}
              >
                <span className={done ? "green-text" : ""}>
                  {done ? <Check size={18} /> : String(i + 1).padStart(2, "0")}
                </span>
                <span>
                  {catalog[x.exerciseId].name}
                  <small>
                    {x.sets} × {x.min}–{x.max}{" "}
                    {catalog[x.exerciseId].kind === "seconds" ? "sec" : "reps"}
                  </small>
                </span>
              </button>
            );
          })}
          <Button
            variant="ghost"
            onClick={() => {
              if (
                window.confirm(
                  "Abandon this session? It will be retained as unfinished and excluded from completed statistics.",
                )
              )
                patch((s) => ({
                  ...s,
                  status: "abandoned",
                  elapsed: elapsed(s),
                  lastResumedAt: null,
                }));
            }}
          >
            Abandon session
          </Button>
        </aside>
        <div>
          <section className="card live-exercise">
            <div className="row between">
              <span className="eyebrow blue">
                EXERCISE {currentIndex + 1} OF {session.exercises.length}
              </span>
              <Button variant="ghost" size="sm" onClick={() => setGuide(true)}>
                <Info size={16} /> Form guide
              </Button>
            </div>
            <h2>{exercise.name}</h2>
            <div className="chips">
              <span>{exercise.primary}</span>
              <span>
                {p.sets} sets × {p.min}–{p.max}{" "}
                {exercise.kind === "seconds" ? "seconds" : "reps"}
                {exercise.unilateral ? " / side" : ""}
              </span>
              <span>{p.rest}s rest</span>
            </div>
            <ExerciseAnimation key={exercise.id} exercise={exercise} />
            <p className="muted">{exercise.steps[0]}</p>
            {!available(exercise, data.equipment) && (
              <p className="notice orange">
                Required equipment is unavailable. Skip this movement and edit
                the plan to use an available alternative.
              </p>
            )}
            <details
              className="simple-details"
              open={
                last?.logs.some(
                  (l) => l.exerciseId === p.exerciseId && l.pain,
                ) || undefined
              }
            >
              <summary>Weight advice & next-session guidance</summary>
              <p>{rec.text}</p>
              {rec.weight !== undefined && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Apply ${rec.weight} to this planned exercise? Review your technique and recovery before using the higher resistance.`,
                      )
                    ) {
                      update((d) => ({
                        ...d,
                        plans: d.plans.map((plan) => ({
                          ...plan,
                          exercises: plan.exercises.map((x) =>
                            x.exerciseId === p.exerciseId
                              ? { ...x, weight: rec.weight }
                              : x,
                          ),
                        })),
                        sessions: d.sessions.map((s) =>
                          s.id === session.id
                            ? {
                                ...s,
                                exercises: s.exercises.map((x) =>
                                  x.id === p.id
                                    ? { ...x, weight: rec.weight }
                                    : x,
                                ),
                              }
                            : s,
                        ),
                      }));
                    }
                  }}
                >
                  Confirm suggested load
                </Button>
              )}
            </details>
            <p className="tiny muted">
              Previous performance:{" "}
              {last
                ? last.logs
                    .filter((l) => l.exerciseId === p.exerciseId)
                    .map(
                      (l) =>
                        `${l.reps ?? l.repRange ?? l.seconds} ${l.seconds ? "sec" : "reps"}${l.unit !== "bodyweight" ? ` @ ${l.weight} ${l.unit}` : ""}${l.side !== "both" ? ` (${l.side})` : ""}`,
                    )
                    .join(" · ")
                : "No completed sets yet."}
            </p>
            <SetForm
              key={`${session.id}-${p.id}`}
              exerciseId={p.exerciseId}
              disabled={
                session.status === "paused" ||
                !available(exercise, data.equipment)
              }
              suggested={p.weight}
              min={p.min}
              rest={p.rest}
              logs={logs}
              onLog={(log) => patch((s) => ({ ...s, logs: [...s.logs, log] }))}
            />
            {logs.length > 0 && (
              <div className="logged-sets">
                {logs.map((l) => (
                  <div className="row between" key={l.id}>
                    <span className="green-text">
                      <Check size={15} /> Set {l.set}{" "}
                      {l.side !== "both" ? `· ${l.side}` : ""}
                    </span>
                    <span>
                      {l.seconds
                        ? `${l.seconds}s`
                        : l.reps === null
                          ? `${l.repRange} reps (exact unknown)`
                          : `${l.reps} reps`}
                      {l.unit !== "bodyweight"
                        ? ` @ ${l.weight} ${l.unit}`
                        : ""}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Undo logged set"
                      onClick={() =>
                        patch((s) => ({
                          ...s,
                          logs: s.logs.filter((x) => x.id !== l.id),
                        }))
                      }
                    >
                      Undo
                    </Button>
                  </div>
                ))}
              </div>
            )}
            <div className="row between modal-actions">
              <Button
                variant="outline"
                disabled={currentIndex === 0}
                onClick={() => setIndex(currentIndex - 1)}
              >
                Previous
              </Button>
              <Button
                disabled={currentIndex === session.exercises.length - 1}
                onClick={() => setIndex(currentIndex + 1)}
              >
                Next exercise <ArrowRight size={17} />
              </Button>
            </div>
          </section>
          <section className="card finish-card">
            <h3>How are you feeling?</h3>
            <Field label="Session notes">
              <textarea
                maxLength={5000}
                value={session.notes}
                placeholder="Energy, technique, anything to remember…"
                onChange={(e) =>
                  patch((s) => ({ ...s, notes: e.target.value }))
                }
              />
            </Field>
            <Field label="Recovery today">
              <select
                value={session.recovery}
                onChange={(e) =>
                  patch((s) => ({
                    ...s,
                    recovery: e.target.value as Session["recovery"],
                  }))
                }
              >
                <option value="good">Good / normal</option>
                <option value="poor">Poor — tired or under-recovered</option>
              </select>
            </Field>
            <p className="tiny muted">
              Finishing records only the sets you logged. Skipped exercises
              never count as completed sets.
            </p>
            <Button
              disabled={!session.logs.length}
              onClick={() => {
                if (
                  session.logs.length < targetSets &&
                  !window.confirm(
                    "Finish with only the sets you recorded? Unlogged sets will not be counted.",
                  )
                )
                  return;
                const done = {
                  ...session,
                  status: "completed" as const,
                  elapsed: elapsed(session),
                  lastResumedAt: null,
                };
                if (patch(() => done)) setSummary(done);
              }}
            >
              <Check size={17} /> Finish & save workout
            </Button>
          </section>
        </div>
      </div>
      {guide && <Guide exercise={exercise} onClose={() => setGuide(false)} />}
    </>
  );
}
function SetForm({
  exerciseId,
  disabled,
  suggested,
  min,
  rest,
  logs,
  onLog,
}: {
  exerciseId: string;
  disabled: boolean;
  suggested?: number;
  min: number;
  rest: number;
  logs: SetLog[];
  onLog: (l: SetLog) => void;
}) {
  const { data } = useApp();
  const exercise = catalog[exerciseId];
  const [weight, setWeight] = useState<string>(
    suggested !== undefined ? String(suggested) : "",
  );
  const [reps, setReps] = useState(String(min));
  const [side, setSide] = useState<"both" | "left" | "right">(
    exercise.unilateral ? "left" : "both",
  );
  const [difficulty, setDifficulty] =
    useState<SetLog["difficulty"]>("Moderate");
  const [rir, setRir] = useState("");
  const [pain, setPain] = useState(false);
  const [technique, setTechnique] = useState(true);
  const [notes, setNotes] = useState("");
  const [timerKey, setTimerKey] = useState(0);
  const [restStarted, setRestStarted] = useState(false);
  const unit =
    exercise.load === "band"
      ? "lb"
      : exercise.load === "bodyweight"
        ? "bodyweight"
        : "kg";
  const gear = data.equipment.find(
    (g) => g.available && g.type === exercise.gear.find((g) => g !== "Bench"),
  );
  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (disabled) return;
          onLog({
            id: crypto.randomUUID(),
            exerciseId,
            set: logs.filter((l) => l.side === side).length + 1,
            side,
            reps: exercise.kind === "seconds" ? null : +reps,
            ...(exercise.kind === "seconds" ? { seconds: +reps } : {}),
            weight:
              unit === "bodyweight"
                ? 0
                : weight === ""
                  ? (suggested ?? 0)
                  : +weight,
            unit,
            difficulty,
            rir: rir === "" ? null : +rir,
            pain,
            technique,
            notes,
          });
          if (exercise.unilateral) setSide(side === "left" ? "right" : "left");
          if (data.autoRest) {
            setRestStarted(true);
            setTimerKey((v) => v + 1);
          }
        }}
      >
        <fieldset disabled={disabled}>
          <legend>Log your actual performance</legend>
          <div className="form-grid">
            {unit !== "bodyweight" && (
              <Field
                label={
                  unit === "lb"
                    ? "Band rating (lb nominal)"
                    : exercise.load === "dumbbell"
                      ? "Weight (kg per dumbbell)"
                      : "Kettlebell weight (kg)"
                }
              >
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="500"
                  required
                  placeholder="Enter actual load"
                  value={
                    suggested !== undefined && weight === ""
                      ? suggested
                      : weight
                  }
                  onChange={(e) => setWeight(e.target.value)}
                />
              </Field>
            )}
            <Field
              label={
                exercise.kind === "seconds"
                  ? "Hold / activity (seconds)"
                  : "Actual repetitions"
              }
            >
              <input
                type="number"
                required
                min="1"
                max={exercise.kind === "seconds" ? 7200 : 1000}
                value={reps}
                onChange={(e) => setReps(e.target.value)}
              />
            </Field>
            {exercise.unilateral && (
              <Field label="Side performed">
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as typeof side)}
                >
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                </select>
              </Field>
            )}
            <Field label="Difficulty">
              <select
                value={difficulty}
                onChange={(e) =>
                  setDifficulty(e.target.value as SetLog["difficulty"])
                }
              >
                <option>Easy</option>
                <option>Moderate</option>
                <option>Hard</option>
              </select>
            </Field>
          </div>
          {gear && (
            <p className="tiny muted">
              {gear.weights.length
                ? `Confirmed available: ${gear.weights.join(", ")} ${unit}${exercise.load === "dumbbell" ? " each" : ""}`
                : "Exact weight combinations unconfirmed. Record the actual load you use."}
              {exercise.load === "dumbbell" &&
                ` · ${exercise.count} dumbbell${exercise.count > 1 ? "s" : ""} used for this exercise.`}
            </p>
          )}
          <div className="row wrap">
            <label className="check-row">
              <input
                type="checkbox"
                checked={technique}
                onChange={(e) => setTechnique(e.target.checked)}
              />{" "}
              Good, controlled technique
            </label>
            <label className="check-row">
              <input
                type="checkbox"
                checked={pain}
                onChange={(e) => setPain(e.target.checked)}
              />{" "}
              Pain / discomfort
            </label>
          </div>
          {pain && (
            <p className="notice orange">
              Stop the provoking exercise. Do not push through sharp pain or
              persistent discomfort. Logging this helps your next recommendation
              adapt.
            </p>
          )}
          <details className="simple-details">
            <summary>Optional: reps in reserve & notes</summary>{" "}
            <Field label="Reps in reserve (optional)">
              <input
                type="number"
                min="0"
                max="20"
                placeholder="Unknown"
                value={rir}
                onChange={(e) => setRir(e.target.value)}
              />
            </Field>{" "}
            <Field label="Set notes (optional)">
              <input
                value={notes}
                maxLength={2000}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="How did that set feel?"
              />
            </Field>
          </details>
          <Button type="submit" className="full">
            <Check size={17} /> Complete set{" "}
            {logs.filter((l) => l.side === side).length + 1}
            {side !== "both" ? ` · ${side}` : ""}
          </Button>
        </fieldset>
      </form>
      <RestTimer key={timerKey} initial={rest} running={restStarted} />
    </>
  );
}
function RestTimer({
  initial,
  running,
}: {
  initial: number;
  running: boolean;
}) {
  const [duration, setDuration] = useState(initial);
  const [remaining, setRemaining] = useState(initial);
  const [deadline, setDeadline] = useState<number | null>(() =>
    running ? Date.now() + initial * 1000 : null,
  );
  useEffect(() => {
    if (deadline === null) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setDeadline(null);
    }, 250);
    return () => clearInterval(id);
  }, [deadline]);
  return (
    <div className="rest-timer">
      <div className="row between">
        <span className="muted">REST & RESET</span>
        <strong aria-live="off">{minutes(remaining)}</strong>
      </div>
      <div className="row wrap">
        {[30, 60, 90, 120].map((n) => (
          <Button
            variant="ghost"
            size="sm"
            key={n}
            onClick={() => {
              setDuration(n);
              setRemaining(n);
              setDeadline(Date.now() + n * 1000);
            }}
          >
            {n}s
          </Button>
        ))}
        <input
          type="number"
          min={1}
          max={600}
          aria-label="Custom rest duration in seconds"
          value={duration}
          onChange={(e) => {
            const n = Math.min(600, Math.max(1, +e.target.value));
            setDuration(n);
            setRemaining(n);
            setDeadline(null);
          }}
        />
        <Button
          variant="outline"
          size="sm"
          aria-label={deadline ? "Pause rest timer" : "Resume rest timer"}
          onClick={() =>
            setDeadline(deadline ? null : Date.now() + remaining * 1000)
          }
        >
          {deadline ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Restart rest timer"
          onClick={() => {
            setRemaining(duration);
            setDeadline(Date.now() + duration * 1000);
          }}
        >
          <RotateCcw size={16} />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-label="Skip rest timer"
          onClick={() => {
            setRemaining(0);
            setDeadline(null);
          }}
        >
          <SkipForward size={16} />
        </Button>
      </div>
      {remaining === 0 && (
        <span role="status" className="green-text tiny">
          Rest finished. Continue when ready.
        </span>
      )}
    </div>
  );
}
