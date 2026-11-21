"use client";
import { useState } from "react";
import { Download, Upload, Copy, ChevronRight } from "lucide-react";
import { useApp } from "./provider";
import { Button } from "./ui/button";
import { Modal, Field, Empty, dateLabel, minutes } from "./common";
import { catalog } from "@/lib/catalog";
import { importHistorical } from "@/lib/imports";
import { sessionSchema, dataSchema } from "@/lib/validation";
import { totals, records } from "@/lib/engine";
import type { Plan, Session } from "@/lib/types";
import { download } from "./equipment-settings";
function csv(sessions: Session[]) {
  const quote = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  return [
    [
      "Date",
      "Workout",
      "Duration seconds",
      "Exercise",
      "Set",
      "Side",
      "Reps",
      "Original rep range",
      "Seconds",
      "Load",
      "Unit",
      "Dumbbells used",
      "Difficulty",
      "RIR",
      "Pain",
      "Notes",
    ],
    ...sessions
      .filter((s) => s.status === "completed")
      .flatMap((s) =>
        s.logs.map((l) => [
          s.date,
          s.name,
          s.durationUnknown ? "" : s.elapsed,
          catalog[l.exerciseId].name,
          l.set,
          l.side,
          l.reps,
          l.repRange,
          l.seconds,
          l.weight,
          l.unit,
          catalog[l.exerciseId].load === "dumbbell"
            ? catalog[l.exerciseId].count
            : "",
          l.difficulty,
          l.rir,
          l.pain,
          [s.notes, l.notes].filter(Boolean).join(" / "),
        ]),
      ),
  ]
    .map((row) => row.map(quote).join(","))
    .join("\r\n");
}
export function History({ start }: { start: (p: Plan) => void }) {
  const { data, update } = useApp();
  const [selected, setSelected] = useState<Session | null>(null);
  const [compare, setCompare] = useState("");
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState("");
  const completed = data.sessions
    .filter((s) => s.status === "completed")
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || b.startedAt.localeCompare(a.startedAt),
    );
  const other = completed.find((s) => s.id === compare);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EVERY SESSION TELLS A STORY</p>
          <h1>
            Your training journal<span className="blue">.</span>
          </h1>
          <p className="muted">A record of the work you actually put in.</p>
        </div>
        <div className="row wrap">
          <Button
            variant="outline"
            onClick={() =>
              download("fitforge-workouts.csv", csv(data.sessions), "text/csv")
            }
          >
            <Download size={16} /> CSV
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              download(
                "fitforge-workouts.json",
                JSON.stringify(completed, null, 2),
              )
            }
          >
            JSON
          </Button>
          <Button onClick={() => setImporting(true)}>
            <Upload size={16} /> Import
          </Button>
        </div>
      </div>
      {completed.length ? (
        <div className="history-list">
          {completed.map((s) => {
            const t = totals([s]);
            return (
              <button
                className="card history-card"
                key={s.id}
                onClick={() => {
                  setSelected(structuredClone(s));
                  setCompare("");
                }}
              >
                <div className="history-date">
                  <strong>{s.date.slice(-2)}</strong>
                  <small>
                    {new Date(s.date + "T12:00:00").toLocaleDateString(
                      "en-AU",
                      { month: "short" },
                    )}
                  </small>
                </div>
                <div>
                  <span className="eyebrow green-text">
                    COMPLETED{s.source ? " · IMPORTED" : ""}
                  </span>
                  <h3>{s.name}</h3>
                  <p className="muted tiny">
                    {new Set(s.logs.map((l) => l.exerciseId)).size} exercises ·{" "}
                    {t.sets} sets · {t.reps} known reps
                    {s.logs.some((l) => l.pain) ? " · Discomfort recorded" : ""}
                  </p>
                </div>
                <span className="muted">
                  {s.durationUnknown ? "Time unknown" : minutes(s.elapsed)}
                </span>
                <ChevronRight size={20} />
              </button>
            );
          })}
        </div>
      ) : (
        <section className="card">
          <Empty title="Your story starts with one session">
            Complete a workout, or explicitly import your November sessions.
            Nothing is added automatically.
          </Empty>
        </section>
      )}
      {data.sessions.some((s) => s.status === "abandoned") && (
        <p className="muted tiny">
          {data.sessions.filter((s) => s.status === "abandoned").length}{" "}
          abandoned sessions retained in your full backup, excluded from
          completion statistics.
        </p>
      )}
      {selected && (
        <Modal title={selected.name} onClose={() => setSelected(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const checked = sessionSchema.safeParse(selected);
              if (!checked.success) {
                setMessage(
                  "Check that all values are within the allowed range.",
                );
                return;
              }
              update((d) => ({
                ...d,
                sessions: d.sessions.map((s) =>
                  s.id === selected.id ? selected : s,
                ),
              }));
              setSelected(null);
            }}
          >
            <div className="form-grid">
              <Field label="Workout date">
                <input
                  required
                  type="date"
                  value={selected.date}
                  onChange={(e) =>
                    setSelected({ ...selected, date: e.target.value })
                  }
                />
              </Field>
              <Field label="Actual duration (minutes, blank if unknown)">
                <input
                  min={0}
                  max={10080}
                  step="0.1"
                  type="number"
                  value={
                    selected.durationUnknown
                      ? ""
                      : Math.round(selected.elapsed / 6) / 10
                  }
                  onChange={(e) =>
                    setSelected({
                      ...selected,
                      elapsed:
                        e.target.value === ""
                          ? 0
                          : Math.round(+e.target.value * 60),
                      durationUnknown: e.target.value === "",
                    })
                  }
                />
              </Field>
            </div>
            <p className="tiny muted">
              Correct accidental logging errors below. Unknown historical rep
              ranges are retained until you enter an exact value.
            </p>
            {selected.logs.map((l, i) => (
              <div className="history-log" key={l.id}>
                <strong>{catalog[l.exerciseId].name}</strong>
                <span className="tiny muted">
                  {" "}
                  Set {l.set} · {l.side === "both" ? "bilateral" : l.side} ·{" "}
                  {l.difficulty}
                  {l.pain ? " · discomfort" : ""}
                </span>
                <div className="form-grid">
                  <Field
                    label={
                      l.seconds
                        ? "Seconds"
                        : l.repRange && l.reps === null
                          ? `Reps (original ${l.repRange}; exact unknown)`
                          : "Exact reps"
                    }
                  >
                    <input
                      type="number"
                      min={0}
                      max={l.seconds ? 7200 : 1000}
                      value={l.seconds ?? l.reps ?? ""}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          logs: selected.logs.map((x, j) =>
                            j === i
                              ? l.seconds
                                ? { ...x, seconds: +e.target.value }
                                : {
                                    ...x,
                                    reps:
                                      e.target.value === ""
                                        ? null
                                        : +e.target.value,
                                  }
                              : x,
                          ),
                        })
                      }
                    />
                  </Field>
                  {l.unit !== "bodyweight" && (
                    <Field
                      label={
                        l.unit === "lb"
                          ? "Band rating (lb nominal)"
                          : "kg per dumbbell / kettlebell"
                      }
                    >
                      <input
                        type="number"
                        min={0}
                        max={500}
                        step="0.1"
                        value={l.weight}
                        onChange={(e) =>
                          setSelected({
                            ...selected,
                            logs: selected.logs.map((x, j) =>
                              j === i ? { ...x, weight: +e.target.value } : x,
                            ),
                          })
                        }
                      />
                    </Field>
                  )}
                  <Field label="Difficulty">
                    <select
                      value={l.difficulty}
                      onChange={(e) =>
                        setSelected({
                          ...selected,
                          logs: selected.logs.map((x, j) =>
                            j === i
                              ? {
                                  ...x,
                                  difficulty: e.target
                                    .value as typeof x.difficulty,
                                }
                              : x,
                          ),
                        })
                      }
                    >
                      <option>Easy</option>
                      <option>Moderate</option>
                      <option>Hard</option>
                    </select>
                  </Field>
                </div>
                <Field label="Set notes">
                  <input
                    maxLength={2000}
                    value={l.notes}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        logs: selected.logs.map((x, j) =>
                          j === i ? { ...x, notes: e.target.value } : x,
                        ),
                      })
                    }
                  />
                </Field>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={l.pain}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        logs: selected.logs.map((x, j) =>
                          j === i ? { ...x, pain: e.target.checked } : x,
                        ),
                      })
                    }
                  />
                  Pain / discomfort
                </label>
              </div>
            ))}
            <Field label="Session notes">
              <textarea
                maxLength={5000}
                value={selected.notes}
                onChange={(e) =>
                  setSelected({ ...selected, notes: e.target.value })
                }
              />
            </Field>
            <p className="tiny muted">
              Personal bests on this date:{" "}
              {Object.entries(records(data.sessions))
                .filter(([, r]) => r.date === selected.date)
                .map(([id]) => catalog[id].name)
                .join(", ") || "None currently standing."}
            </p>
            <Field label="Compare with a completed session">
              <select
                value={compare}
                onChange={(e) => setCompare(e.target.value)}
              >
                <option value="">Choose session…</option>
                {completed
                  .filter((s) => s.id !== selected.id)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.date} · {s.name}
                    </option>
                  ))}
              </select>
            </Field>
            {other && (
              <p className="notice">
                {dateLabel(selected.date)}: {totals([selected]).sets} sets,{" "}
                {totals([selected]).reps} known reps,{" "}
                {Math.round(totals([selected]).volume)} kg-reps.
                <br />
                {dateLabel(other.date)}: {totals([other]).sets} sets,{" "}
                {totals([other]).reps} known reps,{" "}
                {Math.round(totals([other]).volume)} kg-reps. Compare similar
                exercise selections for useful context.
              </p>
            )}
            {message && <p role="alert">{message}</p>}
            <div className="row between modal-actions">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  const ids = [
                    ...new Set(selected.logs.map((l) => l.exerciseId)),
                  ];
                  const plan: Plan = {
                    id: selected.planId,
                    name: selected.name,
                    subtitle: "Repeated from your journal",
                    day: 0,
                    minutes: 40,
                    exercises: selected.exercises.length
                      ? selected.exercises
                      : ids.map((id) => ({
                          id: crypto.randomUUID(),
                          exerciseId: id,
                          sets: Math.max(
                            ...selected.logs
                              .filter((l) => l.exerciseId === id)
                              .map((l) => l.set),
                          ),
                          min: catalog[id].kind === "seconds" ? 20 : 8,
                          max: catalog[id].kind === "seconds" ? 40 : 12,
                          rest: 75,
                        })),
                  };
                  setSelected(null);
                  start(plan);
                }}
              >
                <Copy size={16} /> Repeat workout
              </Button>
              <Button type="submit">Save corrections</Button>
            </div>
          </form>
        </Modal>
      )}
      {importing && (
        <Modal
          title="Bring your history with you"
          onClose={() => setImporting(false)}
        >
          <h3>Your provided November sessions</h3>
          <p className="muted">
            4 November 2026: band curls, squats, rows, reverse crunches, incline
            push-ups.
            <br />6 November 2026: rows, pulldowns, curls, hammer curls,
            crunches, lunges and 10 push-ups.
          </p>
          <p className="notice">
            Repetition ranges remain ranges. Duration is unknown. Band
            discomfort is preserved. These records are imported only when you
            choose below, and never duplicated.
          </p>
          <Button
            onClick={() => {
              const result = importHistorical(data.sessions);
              setMessage(
                `${result.length - data.sessions.length} sessions imported. Existing imports were skipped.`,
              );
              update((d) => ({ ...d, sessions: importHistorical(d.sessions) }));
            }}
          >
            Import my two historical workouts
          </Button>
          <hr />
          <h3>Import exported JSON</h3>
          <p className="muted tiny">
            Accepts a FitForge workout export or full backup. A backup restores
            preferences and merges sessions by ID. Files are validated before
            use. Maximum 10 MB.
          </p>
          <input
            type="file"
            accept="application/json,.json"
            aria-label="Import FitForge JSON"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                if (file.size > 10_000_000) throw Error("File is too large.");
                const raw = JSON.parse(await file.text());
                if (Array.isArray(raw)) {
                  const parsed = raw.map((s) => sessionSchema.parse(s));
                  if (
                    parsed.some(
                      (s) =>
                        s.logs.some((l) => !catalog[l.exerciseId]) ||
                        s.exercises.some((p) => !catalog[p.exerciseId]),
                    )
                  )
                    throw Error("Unknown exercise.");
                  if (parsed.some((s) => s.status !== "completed"))
                    throw Error(
                      "Workout imports must contain completed sessions.",
                    );
                  update((d) => ({
                    ...d,
                    sessions: [
                      ...d.sessions,
                      ...parsed.filter(
                        (s) =>
                          !d.sessions.some(
                            (x) =>
                              x.id === s.id ||
                              (s.source && x.source === s.source),
                          ),
                      ),
                    ],
                  }));
                  setMessage("Valid sessions imported; duplicate IDs skipped.");
                } else {
                  const parsed = dataSchema.parse(raw);
                  if (
                    !window.confirm(
                      "Restore this backup’s profile, equipment, measurements and plans? Existing sessions will be merged by ID.",
                    )
                  )
                    return;
                  update((d) => ({
                    ...parsed,
                    sessions: [
                      ...d.sessions,
                      ...parsed.sessions.filter(
                        (s) => !d.sessions.some((x) => x.id === s.id),
                      ),
                    ],
                  }));
                  setMessage("Backup restored.");
                }
              } catch (err) {
                setMessage(
                  `Import rejected: ${err instanceof Error ? err.message : "invalid file"}`,
                );
              }
              e.target.value = "";
            }}
          />
          <p role="status">{message}</p>
        </Modal>
      )}
    </>
  );
}
