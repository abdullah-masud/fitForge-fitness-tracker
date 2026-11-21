"use client";
import { useState } from "react";
import { Flame, ArrowRight, Check, Dumbbell } from "lucide-react";
import { useApp } from "./provider";
import { Button } from "./ui/button";
import { Field } from "./common";
import { optionalPlan } from "@/lib/catalog";
import { adaptPlan } from "@/lib/engine";
export function Onboarding() {
  const { data, update } = useApp();
  const [step, setStep] = useState(0);
  const [name, setName] = useState(data.name === "Athlete" ? "" : data.name);
  const [goals, setGoals] = useState(data.goals);
  const [gear, setGear] = useState(data.equipment);
  const [days, setDays] = useState([3, 5, 0]);
  const [four, setFour] = useState(false);
  const [fourDay, setFourDay] = useState(1);
  const [weights, setWeights] = useState("");
  const titles = [
    "Welcome to FitForge.",
    "Make it personal.",
    "Your space. Your equipment.",
    "Make room for progress.",
    "Start strong. Start simple.",
    "Your foundation is ready.",
  ];
  return (
    <main className="onboarding">
      <div className="brand">
        <Flame /> FitForge<span>™</span>
      </div>
      <div className="onboarding-card card">
        <div className="row between">
          <span className="eyebrow">YOUR FIRST CHAPTER</span>
          <span className="muted tiny">0{step + 1} / 06</span>
        </div>
        <div className="step-track">
          {titles.map((_, i) => (
            <i key={i} className={i <= step ? "active" : ""} />
          ))}
        </div>
        <h1>{titles[step]}</h1>
        {step === 0 && (
          <>
            <div className="welcome-art">
              <Dumbbell size={96} strokeWidth={1} />
              <span>
                BUILD YOUR
                <br />
                <strong>STRONGER SELF.</strong>
              </span>
            </div>
            <p className="muted">
              A thoughtful training plan for your home gym. Small, consistent
              steps. Real, measurable progress.
            </p>
            <Field label="What should we call you?">
              <input
                maxLength={60}
                placeholder="Your first name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
          </>
        )}
        {step === 1 && (
          <>
            <p className="muted">
              Choose your focus. Your plan will still train your whole body.
            </p>
            <div className="goal-options">
              {["Biceps", "Chest", "Abs", "Legs", "Full-body fitness"].map(
                (g) => (
                  <button
                    key={g}
                    className={goals.includes(g) ? "selected" : ""}
                    onClick={() =>
                      setGoals((old) =>
                        old.includes(g)
                          ? old.filter((x) => x !== g)
                          : [...old, g],
                      )
                    }
                  >
                    {g}
                    {goals.includes(g) && <Check size={18} />}
                  </button>
                ),
              )}
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <p className="muted">
              Confirm what’s available. You can change every detail later.
            </p>
            {gear.map((g) => (
              <label className="check-row" key={g.id}>
                <input
                  type="checkbox"
                  checked={g.available}
                  onChange={(e) =>
                    setGear((old) =>
                      old.map((x) =>
                        x.id === g.id
                          ? { ...x, available: e.target.checked }
                          : x,
                      ),
                    )
                  }
                />
                <span>
                  {g.quantity} × {g.name}
                  <small>
                    {g.type === "Dumbbells"
                      ? "About 2–12 kg each; exact combinations unconfirmed"
                      : g.weights.length
                        ? g.weights.join(", ") +
                          (g.type === "Resistance bands"
                            ? " lb nominal"
                            : " kg")
                        : g.angles}
                  </small>
                </span>
              </label>
            ))}
            <Field label="Confirmed dumbbell weights (kg each, comma separated; optional)">
              <input
                placeholder="Leave blank if unconfirmed"
                value={weights}
                onChange={(e) => setWeights(e.target.value)}
                pattern="\s*([0-9]+(\.[0-9]+)?\s*(,\s*[0-9]+(\.[0-9]+)?\s*)*)?"
              />
            </Field>
          </>
        )}
        {step === 3 && (
          <>
            <p className="muted">
              Three strength days, with room to recover between sessions.
            </p>
            {days.map((day, i) => (
              <Field key={i} label={`Strength ${"ABC"[i]}`}>
                <select
                  value={day}
                  onChange={(e) =>
                    setDays((old) =>
                      old.map((v, j) => (i === j ? +e.target.value : v)),
                    )
                  }
                >
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((d, j) => (
                    <option key={d} value={j}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            ))}
            <label className="check-row">
              <input
                type="checkbox"
                checked={four}
                onChange={(e) => setFour(e.target.checked)}
              />{" "}
              Add a fourth day for cardio & mobility
            </label>
            {four && (
              <Field label="Recovery activity day">
                <select
                  value={fourDay}
                  onChange={(e) => setFourDay(+e.target.value)}
                >
                  {[
                    "Sunday",
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                  ].map((d, j) => (
                    <option key={d} value={j}>
                      {d}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            {new Set(days).size < 3 && (
              <p className="orange-text">
                Choose three different strength days.
              </p>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <div className="notice">
              <h3>Beginner · a foundation built to last</h3>
              <p>
                2 working sets per exercise · usually 8–12 reps · 30–50 minutes.
              </p>
            </div>
            <p className="muted">
              Learn the movements, leave a few reps in reserve, and build
              gradually. Rest days are part of the plan.
            </p>
            <p className="tiny muted">
              Your experience setting is editable later. This first program
              intentionally keeps beginner volume.
            </p>
          </>
        )}
        {step === 5 && (
          <>
            <div className="success-icon">
              <Check size={34} />
            </div>
            <h3>3 strength sessions. One stronger you.</h3>
            <p className="muted">
              Chest and arms get extra attention, with legs, back and core in
              balance. Your journal starts empty — every milestone will be
              earned.
            </p>
            <div className="chips">
              {goals.map((g) => (
                <span key={g}>{g}</span>
              ))}
            </div>
          </>
        )}
        <div className="row between onboarding-actions">
          <Button
            variant="ghost"
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
          >
            Back
          </Button>
          <Button
            disabled={
              step === 3 &&
              (new Set(days).size < 3 || (four && days.includes(fourDay)))
            }
            onClick={() => {
              if (step < 5) {
                setStep(step + 1);
                return;
              }
              const confirmed = weights
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean)
                .map(Number)
                .filter((n) => Number.isFinite(n) && n > 0 && n <= 500);
              const equipment = gear.map((g) =>
                g.type === "Dumbbells"
                  ? { ...g, weights: [...new Set(confirmed)] }
                  : g,
              );
              update((d) => ({
                ...d,
                name: name.trim() || "Athlete",
                goals,
                equipment,
                onboarded: true,
                plans: [
                  ...d.plans.map((p, i) =>
                    adaptPlan({ ...p, day: days[i] }, equipment),
                  ),
                  ...(four ? [{ ...optionalPlan, day: fourDay }] : []),
                ],
              }));
            }}
          >
            {step === 5 ? "Generate my plan" : "Continue"}
            <ArrowRight size={17} />
          </Button>
        </div>
      </div>
      <p className="muted tiny">
        Designed for your home gym · Australia / Perth
      </p>
    </main>
  );
}
