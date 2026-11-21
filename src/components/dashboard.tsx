"use client";
import {
  ArrowRight,
  Check,
  Dumbbell,
  Footprints,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { useApp } from "./provider";
import { Button } from "./ui/button";
import { today, dayOf, week, schedule, totals, coach } from "@/lib/engine";
import type { Plan } from "@/lib/types";
import { dateLabel } from "./common";
import { programWeek } from "@/lib/program";
export function Dashboard({
  start,
  navigate,
}: {
  start: (p: Plan) => void;
  navigate: (p: string) => void;
}) {
  const { data } = useApp();
  const date = today();
  const days = week(date);
  const scheduled = data.plans.find((p) => p.day === dayOf(date));
  const next = schedule(data.plans).find(
    (s) => s.date > date && s.plans.length,
  );
  const completed = data.sessions.filter((s) => s.status === "completed");
  const active = data.sessions.find(
    (s) => s.status === "active" || s.status === "paused",
  );
  const weekly = completed.filter((s) => days.includes(s.date)).length;
  const total = totals(data.sessions);
  return (
    <div className="simple-home">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{dateLabel(date)}</p>
          <h1>
            Your stronger tomorrow<span className="blue">.</span>
          </h1>
          <p className="muted">
            Hi {data.name}.{" "}
            {scheduled
              ? "Your workout is ready."
              : "Take it easy today. Let your body recover."}
          </p>
        </div>
      </div>
      <section className="card today-card">
        <div className="today-symbol">
          {scheduled || active ? (
            <Dumbbell size={34} />
          ) : (
            <Footprints size={34} />
          )}
        </div>
        <span className="eyebrow blue">
          {active
            ? "PICK UP WHERE YOU LEFT OFF"
            : scheduled
              ? "TODAY’S WORKOUT"
              : "TODAY · RECOVERY"}
        </span>
        <h2>
          {active
            ? active.name
            : scheduled
              ? scheduled.name
              : "A little movement. A little rest."}
        </h2>
        <p className="muted">
          {active
            ? "Your recorded sets are saved. Continue when you’re ready."
            : scheduled
              ? `${scheduled.exercises.length} exercises · About ${scheduled.minutes} minutes`
              : "Try a comfortable 20–30 minute walk and gentle stretching."}
        </p>
        <Button
          onClick={() =>
            active
              ? navigate("workout")
              : scheduled
                ? start(scheduled)
                : navigate("workout")
          }
        >
          {active
            ? "Resume workout"
            : scheduled
              ? "Start workout"
              : "Choose a workout"}
          <ArrowRight size={18} />
        </Button>
        {!active && !scheduled && next && (
          <p className="next-inline">
            Next: <strong>{next.plans[0].name}</strong> · {dateLabel(next.date)}
          </p>
        )}
      </section>
      <button className="program-home-link" onClick={() => navigate("plan")}>
        <span>
          <strong>
            {data.program
              ? `Your ${data.program.weeks}-week plan · week ${programWeek(data.program.startDate)}`
              : "Your 12–24 week muscle-building plan"}
          </strong>
          <small>Chest, biceps, legs & core · review your next phase</small>
        </span>
        <ArrowRight size={19} />
      </button>
      <div className="simple-week-heading">
        <h2>This week</h2>
        <span>
          {weekly} of {data.plans.length} sessions completed
        </span>
      </div>
      <div className="week-calendar">
        {days.map((d) => {
          const plan = data.plans.find((p) => p.day === dayOf(d));
          const done = completed.some((s) => s.date === d);
          return (
            <button
              key={d}
              className={`calendar-day ${d === date ? "today" : ""} ${done ? "done" : ""}`}
              onClick={() => navigate("plan")}
            >
              <span>
                {new Date(d + "T12:00:00").toLocaleDateString("en-AU", {
                  weekday: "short",
                })}
              </span>
              <strong>{+d.slice(-2)}</strong>
              {done ? (
                <Check size={18} />
              ) : plan ? (
                <Dumbbell size={18} />
              ) : (
                <Footprints size={18} />
              )}
              <small>{plan ? plan.name : "Rest"}</small>
            </button>
          );
        })}
      </div>
      <div className="simple-shortcuts">
        <button className="card" onClick={() => navigate("library")}>
          <span className="blue">LEARN</span>
          <h3>How to do each exercise</h3>
          <p className="muted">Watch the movement, then give it a try.</p>
          <span>
            Open exercise guides <ArrowRight size={16} />
          </span>
        </button>
        <button className="card" onClick={() => navigate("progress")}>
          <span className="green-text">YOUR PROGRESS</span>
          <h3>{total.workouts} workouts completed</h3>
          <p className="muted">
            {total.sets} recorded sets · {Math.floor(total.seconds / 60)}{" "}
            minutes
          </p>
          <span>
            See progress <ArrowRight size={16} />
          </span>
        </button>
      </div>
      <details className="simple-details coach-disclosure">
        <summary>Need a little guidance? Ask your coach</summary>
        <Coaching />
      </details>
    </div>
  );
}
export function Coaching() {
  const { data } = useApp();
  const [question, setQuestion] = useState("today");
  return (
    <section className="card coach">
      <div>
        <div className="row">
          <span className="coach-icon">
            <Sparkles size={21} />
          </span>
          <div>
            <h3>A little guidance. A lot of progress.</h3>
            <span className="tiny muted">
              YOUR COACH · RULE-BASED, HISTORY-AWARE
            </span>
          </div>
        </div>
        <p>{coach(data, question)}</p>
      </div>
      <label className="field">
        <span>Ask your coach</span>
        <select value={question} onChange={(e) => setQuestion(e.target.value)}>
          <option value="today">What should I do today?</option>
          <option value="weight">What weight should I start with?</option>
          <option value="increase">When should I increase weight?</option>
          <option value="legs">Am I training legs enough?</option>
          <option value="biceps">Am I training biceps too frequently?</option>
          <option value="sore">What if I’m sore?</option>
          <option value="month">How am I improving this month?</option>
        </select>
      </label>
    </section>
  );
}
