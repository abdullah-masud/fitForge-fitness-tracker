"use client";
import { useState } from "react";
import { useApp } from "./provider";
import { Button } from "./ui/button";
import { Field } from "./common";
import {
  phases,
  programPlans,
  programWeek,
  phaseReadiness,
  weeklyMuscleSets,
} from "@/lib/program";
import { today } from "@/lib/engine";
export function ProgramPanel() {
  const { data, update } = useApp();
  const [weeks, setWeeks] = useState<12 | 24>(data.program?.weeks ?? 12);
  const [phase, setPhase] = useState<1 | 2 | 3>(data.program?.phase ?? 1);
  const [age, setAge] = useState(data.trainingProfile?.age ?? 27);
  const [height, setHeight] = useState(data.trainingProfile?.heightCm ?? 172.7);
  const [weight, setWeight] = useState(data.trainingProfile?.weightKg ?? 65);
  const [limitations, setLimitations] = useState(
    data.trainingProfile?.limitations ?? "No injuries or pain reported",
  );
  const [message, setMessage] = useState("");
  const readiness = phaseReadiness(data);
  const preview = programPlans(data, phase);
  const sets = weeklyMuscleSets(preview);
  const week = data.program ? programWeek(data.program.startDate) : 1;
  const apply = (light = false) => {
    if (
      data.sessions.some((s) => s.status === "active" || s.status === "paused")
    ) {
      setMessage(
        "Finish or abandon your current session before changing the program.",
      );
      return;
    }
    if (
      !window.confirm(
        `${light ? "Use a lighter week" : "Apply this training phase"}? Strength A, B and C will be updated. Other custom workouts and all history stay saved.`,
      )
    )
      return;
    const saved = update((d) => ({
      ...d,
      trainingProfile: { age, heightCm: height, weightKg: weight, limitations },
      program: {
        startDate: d.program?.startDate ?? today(),
        weeks,
        phase,
        lastReviewed: today(),
      },
      plans: [
        ...programPlans(d, phase, light),
        ...d.plans.filter((p) => !["a", "b", "c"].includes(p.id)),
      ],
    }));
    if (!saved) {
      setMessage(
        "The plan could not be saved. Check your profile values and the storage error above.",
      );
      return;
    }
    setMessage(
      light
        ? "Lighter week applied. Return here to restore your phase when recovered."
        : "Plan applied. Your next sessions now use this phase.",
    );
  };
  return (
    <section className="card program-panel">
      <div className="section-title">
        <div>
          <span className="eyebrow blue">YOUR 3–6 MONTH ROADMAP</span>
          <h2>Build chest, arms, legs & a stronger core.</h2>
        </div>
        {data.program && (
          <span className="date-pill">
            Week {week} of {data.program.weeks}
          </span>
        )}
      </div>
      <p className="muted">
        Three strength days, usually 40–50 minutes. Start with a foundation,
        then earn more volume through consistent training and good recovery.
      </p>
      <div className="program-controls">
        <Field label="Plan horizon">
          <select
            value={weeks}
            onChange={(e) => setWeeks(+e.target.value as 12 | 24)}
          >
            <option value={12}>12 weeks · about 3 months</option>
            <option value={24}>24 weeks · about 6 months</option>
          </select>
        </Field>
        <Field label="Phase to preview">
          <select
            value={phase}
            onChange={(e) => setPhase(+e.target.value as 1 | 2 | 3)}
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="phase-roadmap">
        {phases.map((p) => (
          <button
            key={p.id}
            className={phase === p.id ? "selected" : ""}
            onClick={() => setPhase(p.id)}
          >
            <small>{p.range}</small>
            <strong>{p.title}</strong>
            <span>{p.description}</span>
          </button>
        ))}
      </div>
      <p className="notice">
        {phases[phase - 1].milestone}{" "}
        {weeks === 24
          ? "Weeks 13–24 repeat the third phase with a review every four weeks; more sets are not added automatically."
          : ""}
      </p>
      <details className="simple-details">
        <summary>Your profile & weekly training balance</summary>
        <div className="form-grid">
          <Field label="Age">
            <input
              type="number"
              min={18}
              max={100}
              value={age}
              onChange={(e) => setAge(+e.target.value)}
            />
          </Field>
          <Field label="Height (cm; 5′8″ ≈ 172.7 cm)">
            <input
              type="number"
              min={120}
              max={230}
              step="0.1"
              value={height}
              onChange={(e) => setHeight(+e.target.value)}
            />
          </Field>
          <Field label="Current weight (kg)">
            <input
              type="number"
              min={30}
              max={300}
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(+e.target.value)}
            />
          </Field>
          <Field label="Injuries / discomfort">
            <input
              maxLength={1000}
              value={limitations}
              onChange={(e) => setLimitations(e.target.value)}
            />
          </Field>
        </div>
        <div className="chips">
          {Object.entries(sets).map(([m, s]) => (
            <span key={m}>
              {m}: {s} primary sets/week
            </span>
          ))}
        </div>
        <p className="tiny muted">
          Per muscle, per side for unilateral movements. Presses also train
          triceps; rows train biceps. These numbers describe the preview, not
          completed training. If sessions exceed 50 minutes, use the lighter
          option rather than rushing rests.
        </p>
      </details>
      <div className="program-habits">
        <div>
          <h3>For stronger abs</h3>
          <p>
            Train core on all three strength days. More daily crunches will not
            selectively remove belly fat. Track waist and strength every four
            weeks; visible abs have no guaranteed date.
          </p>
        </div>
        <div>
          <h3>Food & recovery</h3>
          <p>
            At {weight} kg, a practical protein range is about{" "}
            {Math.round(weight * 1.4)}–{Math.round(weight * 2)} g/day. Include
            regular balanced meals and sleep consistently. Your height and
            weight alone do not justify an aggressive calorie deficit.
          </p>
        </div>
        <div>
          <h3>Between lifting days</h3>
          <p>
            Start with 20–30 minutes of comfortable walking on 2–4 days.
            Increase gradually as recovery allows. Keep at least one easy day
            between hard strength sessions.
          </p>
        </div>
      </div>
      <p className="tiny muted">
        Review at weeks 4, 8 and 12: compare the same exercise, load, reps and
        technique, plus optional waist/body measurements. Take a lighter week if
        recovery worsens. {readiness.reason}
      </p>
      <div className="row wrap">
        <Button
          disabled={
            age < 18 ||
            age > 100 ||
            height < 120 ||
            height > 230 ||
            weight < 30 ||
            weight > 300
          }
          onClick={() => apply()}
        >
          {data.program ? "Apply selected phase" : "Start this plan"}
        </Button>
        <Button variant="outline" onClick={() => apply(true)}>
          Use a lighter week
        </Button>
        <span className="tiny muted">
          Load increases still require your confirmation.
        </span>
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      <details className="simple-details">
        <summary>Why this approach?</summary>
        <p>
          Start below advanced bodybuilding volumes and build gradually. Muscle
          growth responds to consistent training and sufficient weekly work;
          training to failure is not required.
        </p>
        <p className="tiny">
          <a
            href="https://acsm.org/resistance-training-guidelines-update-2026/"
            target="_blank"
            rel="noreferrer"
          >
            ACSM resistance-training guidance
          </a>{" "}
          ·{" "}
          <a
            href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5477153/"
            target="_blank"
            rel="noreferrer"
          >
            Protein and exercise position stand
          </a>
        </p>
      </details>
    </section>
  );
}
