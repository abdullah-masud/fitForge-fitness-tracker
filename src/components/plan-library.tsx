"use client";
import { useState } from "react";
import { Plus, Play, Trash2, Search, SlidersHorizontal } from "lucide-react";
import { useApp } from "./provider";
import { Button } from "./ui/button";
import { exercises, catalog, optionalPlan } from "@/lib/catalog";
import { available, alternatives, adaptPlan } from "@/lib/engine";
import { ExerciseArt } from "./exercise-art";
import { Guide, Field, Modal } from "./common";
import type { Exercise, Plan } from "@/lib/types";
import { ProgramPanel } from "./program-panel";
export function Library() {
  const { data } = useApp();
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState("All muscles");
  const [gear, setGear] = useState("All equipment");
  const [owned, setOwned] = useState(false);
  const [guide, setGuide] = useState<Exercise | null>(null);
  const filtered = exercises.filter(
    (e) =>
      e.name.toLowerCase().includes(query.toLowerCase()) &&
      (muscle === "All muscles" ||
        e.primary === muscle ||
        e.secondary.includes(muscle as Exercise["primary"])) &&
      (gear === "All equipment" ||
        e.gear.includes(gear as Exercise["gear"][number])) &&
      (!owned || available(e, data.equipment)),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">LEARN THE MOVEMENT. OWN THE REP.</p>
          <h1>
            Exercise library<span className="blue">.</span>
          </h1>
          <p className="muted">Tap an exercise to watch how it moves.</p>
        </div>
        <span className="date-pill">{exercises.length} movement guides</span>
      </div>
      <div className="filter-bar card">
        <label className="search">
          <Search size={18} />
          <input
            aria-label="Search exercises"
            placeholder="Find an exercise…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        <select
          aria-label="Filter muscles"
          value={muscle}
          onChange={(e) => setMuscle(e.target.value)}
        >
          {[
            "All muscles",
            "Chest",
            "Biceps",
            "Triceps",
            "Shoulders",
            "Back",
            "Abs",
            "Quadriceps",
            "Hamstrings",
            "Glutes",
            "Calves",
            "Full body",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <select
          aria-label="Filter equipment"
          value={gear}
          onChange={(e) => setGear(e.target.value)}
        >
          {[
            "All equipment",
            "Dumbbells",
            "Bench",
            "Kettlebell",
            "Resistance bands",
            "Bodyweight",
          ].map((x) => (
            <option key={x}>{x}</option>
          ))}
        </select>
        <label className="check-row">
          <input
            type="checkbox"
            checked={owned}
            onChange={(e) => setOwned(e.target.checked)}
          />{" "}
          My equipment
        </label>
      </div>
      <div className="library-grid">
        {filtered.map((e) => (
          <button
            className="card exercise-card"
            key={e.id}
            onClick={() => setGuide(e)}
          >
            <ExerciseArt exercise={e} />
            <div className="exercise-card-body">
              <span className="eyebrow blue">{e.primary}</span>
              <h3>{e.name}</h3>
              <p className="muted tiny">{e.gear.join(" · ")}</p>
              <span className="tiny">
                Watch demonstration <Play size={14} />
              </span>
              {!available(e, data.equipment) && (
                <small className="orange-text">
                  Equipment unavailable · optional
                </small>
              )}
            </div>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p className="empty">No matching exercises. Try another filter.</p>
      )}
      {guide && <Guide exercise={guide} onClose={() => setGuide(null)} />}
    </>
  );
}
export function WeeklyPlan({
  start,
}: {
  start: (p: Plan, light?: boolean) => void;
}) {
  const { data, update } = useApp();
  const [editing, setEditing] = useState<Plan | null>(null);
  const [guide, setGuide] = useState<Exercise | null>(null);
  const [add, setAdd] = useState("curl");
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">CONSISTENCY OVER COMPLEXITY</p>
          <h1>
            Your training blueprint<span className="blue">.</span>
          </h1>
          <p className="muted">Three foundations. Built around your life.</p>
        </div>
        <Button
          onClick={() =>
            setEditing({
              id: crypto.randomUUID(),
              name: "Custom workout",
              subtitle: "Your personal session",
              day: 2,
              minutes: 35,
              exercises: [],
            })
          }
        >
          <Plus size={17} /> Create workout
        </Button>
      </div>
      <ProgramPanel />
      <div className="notice">
        Aim for recovery between strength days. These sessions start with two
        working sets; warm up gently and choose resistance you can control.
      </div>
      <div className="plan-grid">
        {data.plans.map((p, i) => (
          <section className="card plan-card" key={p.id}>
            <div className="row between">
              <span className="eyebrow blue">{days[p.day]}</span>
              <span className="plan-letter">
                {p.id === "d" ? "D" : ("ABC"[i] ?? "+")}
              </span>
            </div>
            <h2>{p.name}</h2>
            <p className="muted">{p.subtitle}</p>
            <div className="chips">
              <span>{p.minutes} min target</span>
              <span>
                {p.exercises.reduce((n, x) => n + x.sets, 0)} sets
                {p.exercises.some((x) => catalog[x.exerciseId].unilateral)
                  ? " + both sides"
                  : ""}
              </span>
            </div>
            <div className="plan-exercises">
              {p.exercises.map((x, j) => {
                const e = catalog[x.exerciseId];
                const ok = available(e, data.equipment);
                return (
                  <button key={x.id} onClick={() => setGuide(e)}>
                    <span className="exercise-number">
                      {String(j + 1).padStart(2, "0")}
                    </span>
                    <span>
                      <strong>{e.name}</strong>
                      <small>
                        {e.primary} · {x.rest}s rest · ~
                        {Math.ceil(
                          (x.sets *
                            ((e.kind === "seconds" ? x.max : x.max * 4) +
                              x.rest) *
                            (e.unilateral ? 2 : 1)) /
                            60,
                        )}{" "}
                        min{!ok && " · Equipment missing"}
                      </small>
                    </span>
                    <span className="prescription">
                      {x.sets} × {x.min}–{x.max}
                      <small>
                        {e.kind === "seconds"
                          ? "sec"
                          : e.unilateral
                            ? "per side"
                            : "reps"}
                      </small>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="row">
              <Button
                onClick={() => start(adaptPlan(p, data.equipment))}
                disabled={!p.exercises.length}
              >
                <Play size={15} /> Start
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditing(structuredClone(p))}
              >
                <SlidersHorizontal size={15} /> Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => start(adaptPlan(p, data.equipment), true)}
                disabled={!p.exercises.length}
              >
                Go lighter
              </Button>
            </div>
          </section>
        ))}
      </div>
      {!data.plans.some((p) => p.id === "d") && (
        <Button
          variant="outline"
          onClick={() =>
            update((d) => ({ ...d, plans: [...d.plans, optionalPlan] }))
          }
        >
          <Plus size={17} /> Add cardio, core & mobility day
        </Button>
      )}
      {editing && (
        <Modal title="Edit your workout" onClose={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const saved = update((d) => ({
                ...d,
                plans: d.plans.some((p) => p.id === editing.id)
                  ? d.plans.map((p) => (p.id === editing.id ? editing : p))
                  : [...d.plans, editing],
              }));
              if (saved) setEditing(null);
            }}
          >
            <div className="form-grid">
              <Field label="Workout name">
                <input
                  required
                  maxLength={100}
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                />
              </Field>
              <Field label="Training day">
                <select
                  value={editing.day}
                  onChange={(e) =>
                    setEditing({ ...editing, day: +e.target.value })
                  }
                >
                  {days.map((d, i) => (
                    <option key={d} value={i}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Duration target (minutes)">
                <input
                  type="number"
                  required
                  min={5}
                  max={180}
                  value={editing.minutes}
                  onChange={(e) =>
                    setEditing({ ...editing, minutes: +e.target.value })
                  }
                />
              </Field>
            </div>
            {editing.exercises.map((x, i) => (
              <div className="edit-exercise" key={x.id}>
                <div className="row">
                  <select
                    aria-label={`Exercise ${i + 1}`}
                    value={x.exerciseId}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        exercises: editing.exercises.map((y) =>
                          y.id === x.id
                            ? {
                                ...y,
                                exerciseId: e.target.value,
                                weight: undefined,
                                min:
                                  catalog[e.target.value].kind === "seconds"
                                    ? 20
                                    : 8,
                                max:
                                  catalog[e.target.value].kind === "seconds"
                                    ? 40
                                    : 12,
                              }
                            : y,
                        ),
                      })
                    }
                  >
                    {exercises.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                        {available(e, data.equipment)
                          ? ""
                          : " (equipment unavailable)"}
                      </option>
                    ))}
                  </select>
                  <Button
                    type="button"
                    variant="ghost"
                    aria-label={`Remove ${catalog[x.exerciseId].name}`}
                    onClick={() =>
                      setEditing({
                        ...editing,
                        exercises: editing.exercises.filter(
                          (y) => y.id !== x.id,
                        ),
                      })
                    }
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
                <div className="form-grid four">
                  {(["sets", "min", "max", "rest"] as const).map((k) => (
                    <Field
                      key={k}
                      label={
                        k === "rest"
                          ? "Rest (sec)"
                          : k === "min"
                            ? "Min reps / sec"
                            : k === "max"
                              ? "Max reps / sec"
                              : "Sets"
                      }
                    >
                      <input
                        type="number"
                        required
                        min={k === "rest" ? 0 : 1}
                        max={k === "sets" ? 10 : k === "rest" ? 600 : 7200}
                        value={x[k]}
                        onChange={(e) =>
                          setEditing({
                            ...editing,
                            exercises: editing.exercises.map((y) =>
                              y.id === x.id
                                ? { ...y, [k]: +e.target.value }
                                : y,
                            ),
                          })
                        }
                      />
                    </Field>
                  ))}
                </div>
                {!available(catalog[x.exerciseId], data.equipment) && (
                  <p className="orange-text tiny">
                    Missing equipment. Available alternatives:{" "}
                    {alternatives(catalog[x.exerciseId], data.equipment)
                      .map((e) => e.name)
                      .join(", ") || "none for this muscle group"}
                    .
                  </p>
                )}
              </div>
            ))}
            <div className="row">
              <select
                aria-label="Exercise to add"
                value={add}
                onChange={(e) => setAdd(e.target.value)}
              >
                {exercises
                  .filter((e) => available(e, data.equipment))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
              </select>
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setEditing({
                    ...editing,
                    exercises: [
                      ...editing.exercises,
                      {
                        id: crypto.randomUUID(),
                        exerciseId: add,
                        sets: 2,
                        min: catalog[add].kind === "seconds" ? 20 : 8,
                        max: catalog[add].kind === "seconds" ? 40 : 12,
                        rest: 75,
                      },
                    ],
                  })
                }
              >
                Add
              </Button>
            </div>
            <div className="row between modal-actions">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      "Remove this workout from your weekly plan? Saved history will remain.",
                    )
                  ) {
                    update((d) => ({
                      ...d,
                      plans: d.plans.filter((p) => p.id !== editing.id),
                    }));
                    setEditing(null);
                  }
                }}
              >
                Delete workout
              </Button>
              <Button
                type="submit"
                disabled={
                  !editing.exercises.length ||
                  editing.exercises.some((x) => x.max < x.min) ||
                  new Set(editing.exercises.map((x) => x.exerciseId)).size !==
                    editing.exercises.length
                }
              >
                Save plan
              </Button>
            </div>
            {new Set(editing.exercises.map((x) => x.exerciseId)).size !==
              editing.exercises.length && (
              <p role="alert" className="orange-text">
                Use each exercise once per workout. Increase its sets instead of
                adding duplicates.
              </p>
            )}
          </form>
        </Modal>
      )}
      {guide && <Guide exercise={guide} onClose={() => setGuide(null)} />}
    </>
  );
}
