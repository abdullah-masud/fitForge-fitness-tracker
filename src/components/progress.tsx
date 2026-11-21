"use client";
import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Plus, TrendingUp, Trash2 } from "lucide-react";
import { useApp } from "./provider";
import { Button } from "./ui/button";
import { today, shiftDate, totals, volume, week, records } from "@/lib/engine";
import { catalog } from "@/lib/catalog";
import { Field, Modal, Empty, dateLabel } from "./common";
import type { Measurement } from "@/lib/types";
export function Progress() {
  const { data, update } = useApp();
  const [filter, setFilter] = useState(30);
  const [adding, setAdding] = useState(false);
  const [metric, setMetric] = useState("weight");
  const completed = data.sessions.filter(
    (s) =>
      s.status === "completed" &&
      (filter === 0 || s.date >= shiftDate(today(), -(filter - 1))),
  );
  const total = totals(completed);
  const dateMap = new Map<string, Record<string, string | number>>();
  for (const s of completed) {
    const row = dateMap.get(s.date) ?? { date: s.date, volume: 0 };
    row.volume = Number(row.volume) + s.logs.reduce((n, l) => n + volume(l), 0);
    for (const id of ["curl", "bench", "goblet"]) {
      const ls = s.logs.filter((l) => l.exerciseId === id && l.unit === "kg");
      if (ls.length) {
        row[id] = Math.max(Number(row[id]) || 0, ...ls.map((l) => l.weight));
        row[id + "Reps"] = Math.max(
          Number(row[id + "Reps"]) || 0,
          ...ls.map((l) => l.reps ?? 0),
        );
      }
    }
    dateMap.set(s.date, row);
  }
  const chart = [...dateMap.values()].sort((a, b) =>
    String(a.date).localeCompare(String(b.date)),
  );
  const weekly = new Map<string, number>();
  for (const s of completed) {
    const d = week(s.date)[0];
    weekly.set(d, (weekly.get(d) ?? 0) + 1);
  }
  const weekChart = [...weekly.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, workouts]) => ({ date, workouts }));
  const measurements = data.measurements
    .filter((m) => filter === 0 || m.date >= shiftDate(today(), -(filter - 1)))
    .sort((a, b) => a.date.localeCompare(b.date));
  const muscleCounts = Object.entries(
    completed
      .flatMap((s) => [
        ...new Set(s.logs.map((l) => catalog[l.exerciseId].primary)),
      ])
      .reduce(
        (all, m) => ({ ...all, [m]: (all[m] ?? 0) + 1 }),
        {} as Record<string, number>,
      ),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SMALL WINS. BIGGER PICTURE.</p>
          <h1>
            See yourself getting stronger<span className="blue">.</span>
          </h1>
          <p className="muted">
            Only your recorded work. No invented milestones.
          </p>
        </div>
        <select
          aria-label="Progress time range"
          value={filter}
          onChange={(e) => setFilter(+e.target.value)}
        >
          {[
            [7, "7 days"],
            [30, "30 days"],
            [90, "90 days"],
            [183, "6 months"],
            [365, "1 year"],
            [0, "All time"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      </div>
      <div className="stats-grid">
        {[
          ["Completed workouts", total.workouts],
          ["Recorded sets", total.sets],
          ["Known repetitions", total.reps],
          ["Training time", `${Math.floor(total.seconds / 60)} min`],
        ].map(([l, v]) => (
          <section className="card stat" key={l}>
            <span className="muted">{l}</span>
            <strong>{v}</strong>
            <TrendingUp size={18} className="blue" />
          </section>
        ))}
      </div>
      <div className="charts-grid">
        <Chart
          title="Weekly consistency"
          subtitle="Completed sessions · week beginning Monday"
          data={weekChart}
          keys={["workouts"]}
          bar
        />
        <Chart
          title="Biceps · load & reps"
          subtitle="Highest kg per dumbbell and highest set reps each day"
          data={chart.filter((x) => "curl" in x)}
          keys={["curl", "curlReps"]}
          dual
        />
        <Chart
          title="Chest press · load & reps"
          subtitle="Flat bench press · kg per dumbbell / highest set reps"
          data={chart.filter((x) => "bench" in x)}
          keys={["bench", "benchReps"]}
          dual
        />
        <Chart
          title="Leg strength · goblet squat"
          subtitle="Single dumbbell · kg / highest set reps"
          data={chart.filter((x) => "goblet" in x)}
          keys={["goblet", "gobletReps"]}
          dual
        />
        <Chart
          title="External load volume"
          subtitle="kg-reps · both dumbbells counted; bands, bodyweight and unknown reps excluded"
          data={chart}
          keys={["volume"]}
        />
        <section className="card">
          <h3>Muscle training frequency</h3>
          <p className="muted tiny">
            Sessions targeting each primary muscle in this period
          </p>
          {muscleCounts.length ? (
            muscleCounts.map(([m, c]) => (
              <div className="goal-row" key={m}>
                <span>{m}</span>
                <strong>{c} sessions</strong>
              </div>
            ))
          ) : (
            <Empty title="Your balance starts here">
              Log your first session to see your muscle coverage.
            </Empty>
          )}
        </section>
      </div>
      <div className="section-title">
        <div>
          <h2>Beyond the numbers on the dumbbell</h2>
          <p className="muted">Optional, user-entered body measurements.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus size={16} /> Add measurement
        </Button>
      </div>
      <div className="card">
        <Field label="Measurement to chart">
          <select value={metric} onChange={(e) => setMetric(e.target.value)}>
            {["weight", "waist", "biceps", "chest", "thigh"].map((m) => (
              <option key={m} value={m}>
                {m} ({m === "weight" ? "kg" : "cm"})
              </option>
            ))}
          </select>
        </Field>
        <Chart
          title="Body measurements"
          subtitle={
            metric === "weight"
              ? "User-entered kilograms"
              : "User-entered centimetres"
          }
          data={measurements
            .filter((m) => m[metric as keyof Measurement] !== undefined)
            .map((m) => ({ ...m }))}
          keys={[metric]}
        />
        {measurements.map((m) => (
          <div className="record-row" key={m.id}>
            <span>
              {dateLabel(m.date)}
              <small>
                {Object.entries(m)
                  .filter(([k]) => !["id", "date"].includes(k))
                  .map(([k, v]) => `${k}: ${v} ${k === "weight" ? "kg" : "cm"}`)
                  .join(" · ")}
              </small>
            </span>
            <Button
              variant="ghost"
              aria-label="Delete measurement"
              onClick={() => {
                if (window.confirm("Delete this measurement?"))
                  update((d) => ({
                    ...d,
                    measurements: d.measurements.filter((x) => x.id !== m.id),
                  }));
              }}
            >
              <Trash2 size={15} />
            </Button>
          </div>
        ))}
      </div>
      <div className="section-title">
        <h2>Exercise personal records</h2>
      </div>
      <div className="card">
        {Object.entries(records(completed)).length ? (
          Object.entries(records(completed)).map(([id, r]) => (
            <div className="record-row" key={id}>
              <span>
                {catalog[id].name}
                <small>{dateLabel(r.date)}</small>
              </span>
              <strong>
                {r.weight} {r.unit}
                {catalog[id].load === "dumbbell" ? " each" : ""} × {r.reps}
                <small>
                  {r.unit === "lb"
                    ? "Nominal band rating · not comparable to kg"
                    : "Highest recorded load, then reps"}
                </small>
              </strong>
            </div>
          ))
        ) : (
          <Empty title="Your record book is open">
            Record weighted sets to establish your first personal bests.
          </Empty>
        )}
      </div>
      {adding && (
        <Modal title="Add body measurement" onClose={() => setAdding(false)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const m: Measurement = {
                id: crypto.randomUUID(),
                date: String(f.get("date")),
              };
              for (const k of [
                "weight",
                "waist",
                "biceps",
                "chest",
                "thigh",
              ] as const) {
                const v = f.get(k);
                if (v) m[k] = Number(v);
              }
              if (Object.keys(m).length === 2) return;
              update((d) => ({ ...d, measurements: [...d.measurements, m] }));
              setAdding(false);
            }}
          >
            <Field label="Date">
              <input
                name="date"
                type="date"
                required
                max={today()}
                defaultValue={today()}
              />
            </Field>
            {["weight", "waist", "biceps", "chest", "thigh"].map((k) => (
              <Field
                key={k}
                label={`${k} (${k === "weight" ? "kg" : "cm"}, optional)`}
              >
                <input
                  name={k}
                  type="number"
                  step="0.1"
                  min="0.1"
                  max={
                    k === "weight"
                      ? 500
                      : k === "biceps"
                        ? 150
                        : k === "thigh"
                          ? 200
                          : 300
                  }
                />
              </Field>
            ))}
            <Button type="submit">Save measurement</Button>
          </form>
        </Modal>
      )}
    </>
  );
}
function Chart({
  title,
  subtitle,
  data,
  keys,
  bar = false,
  dual = false,
}: {
  title: string;
  subtitle: string;
  data: Record<string, string | number>[];
  keys: string[];
  bar?: boolean;
  dual?: boolean;
}) {
  return (
    <section className="card chart-card">
      <h3>{title}</h3>
      <p className="muted tiny">{subtitle}</p>
      {!data.length ? (
        <Empty title="No records in this period">
          Your real progress will appear here as you train.
        </Empty>
      ) : (
        <div className="chart">
          <ResponsiveContainer width="100%" height={220}>
            {bar ? (
              <BarChart data={data}>
                <CartesianGrid stroke="#29303d" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#98a4b8", fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: "#98a4b8", fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    background: "#1c2330",
                    border: "1px solid #364359",
                    color: "#fff",
                  }}
                />
                {keys.map((k) => (
                  <Bar
                    key={k}
                    dataKey={k}
                    fill="#4285ff"
                    radius={[5, 5, 0, 0]}
                    maxBarSize={36}
                  />
                ))}
              </BarChart>
            ) : (
              <LineChart data={data}>
                <CartesianGrid stroke="#29303d" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: "#98a4b8", fontSize: 10 }}
                  tickFormatter={(v) => v.slice(5)}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "#98a4b8", fontSize: 11 }}
                />
                {dual && (
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: "#4ad5a0", fontSize: 11 }}
                  />
                )}
                <Tooltip
                  contentStyle={{
                    background: "#1c2330",
                    border: "1px solid #364359",
                    color: "#fff",
                  }}
                />
                {keys.map((k, i) => (
                  <Line
                    yAxisId={dual && i === 1 ? "right" : "left"}
                    key={k}
                    dataKey={k}
                    stroke={i ? "#4ad5a0" : "#4285ff"}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    connectNulls={false}
                  />
                ))}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
