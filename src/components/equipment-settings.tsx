"use client";
import { useState } from "react";
import { Dumbbell, Plus, Trash2, Save, LogOut, Download } from "lucide-react";
import { useApp } from "./provider";
import { Button } from "./ui/button";
import { Field, Modal } from "./common";
import type { Equipment } from "@/lib/types";
import { supabase } from "@/lib/supabase";
export function download(
  name: string,
  body: string,
  type = "application/json",
) {
  const url = URL.createObjectURL(new Blob([body], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function EquipmentPage() {
  const { data, update } = useApp();
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [weights, setWeights] = useState("");
  const [error, setError] = useState("");
  const edit = (g: Equipment) => {
    setEditing(structuredClone(g));
    setWeights(g.weights.join(", "));
    setError("");
  };
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">SMALL SPACE. REAL POTENTIAL.</p>
          <h1>
            Your home gym<span className="blue">.</span>
          </h1>
          <p className="muted">
            Your plan adapts to the equipment you actually have.
          </p>
        </div>
        <Button
          onClick={() =>
            edit({
              id: crypto.randomUUID(),
              name: "New equipment",
              type: "Dumbbells",
              available: true,
              weights: [],
              quantity: 1,
            })
          }
        >
          <Plus size={17} /> Add equipment
        </Button>
      </div>
      <div className="notice">
        Dumbbell loads are kilograms per dumbbell. Band ratings are nominal
        pounds, not fixed loads. Exact dumbbell combinations stay unconfirmed
        until you enter them.
      </div>
      <div className="equipment-grid">
        {data.equipment.map((g) => (
          <section className="card equipment-card" key={g.id}>
            <div className="row between">
              <div className="equipment-icon">
                <Dumbbell size={32} />
              </div>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={g.available}
                  onChange={(e) =>
                    update((d) => ({
                      ...d,
                      equipment: d.equipment.map((x) =>
                        x.id === g.id
                          ? { ...x, available: e.target.checked }
                          : x,
                      ),
                    }))
                  }
                />
                {g.available ? "Available" : "Unavailable"}
              </label>
            </div>
            <h2>{g.name}</h2>
            <p className="muted">
              {g.quantity} {g.quantity === 1 ? "item" : "items"} · {g.type}
            </p>
            <div className="chips">
              {g.weights.length ? (
                g.weights.map((w) => (
                  <span key={w}>
                    {w} {g.type === "Resistance bands" ? "lb nominal" : "kg"}
                  </span>
                ))
              ) : (
                <span>
                  {g.type === "Bench" ? g.angles : "Exact weights unconfirmed"}
                </span>
              )}
            </div>
            {g.type === "Dumbbells" && (
              <p className="tiny muted">
                Range: {g.min ?? "?"}–{g.max ?? "?"} kg each · increment{" "}
                {g.increment ? `${g.increment} kg` : "unconfirmed"}
              </p>
            )}
            <Button variant="outline" onClick={() => edit(g)}>
              Configure equipment
            </Button>
          </section>
        ))}
      </div>
      {editing && (
        <Modal title="Configure equipment" onClose={() => setEditing(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const ws = weights
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean)
                .map(Number);
              if (ws.some((n) => !Number.isFinite(n) || n <= 0 || n > 500)) {
                setError(
                  "Use comma-separated positive weights no greater than 500.",
                );
                return;
              }
              if (
                editing.min !== undefined &&
                editing.max !== undefined &&
                editing.min > editing.max
              ) {
                setError("Minimum must be no greater than maximum.");
                return;
              }
              const item = {
                ...editing,
                weights: [...new Set(ws)].sort((a, b) => a - b),
              };
              update((d) => ({
                ...d,
                equipment: d.equipment.some((g) => g.id === item.id)
                  ? d.equipment.map((g) => (g.id === item.id ? item : g))
                  : [...d.equipment, item],
              }));
              setEditing(null);
            }}
          >
            <Field label="Name">
              <input
                required
                maxLength={100}
                value={editing.name}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Field>
            <div className="form-grid">
              <Field label="Equipment type">
                <select
                  value={editing.type}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      type: e.target.value as Equipment["type"],
                    })
                  }
                >
                  {[
                    "Dumbbells",
                    "Bench",
                    "Kettlebell",
                    "Resistance bands",
                    "Bodyweight",
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </Field>
              <Field label="Quantity">
                <input
                  required
                  type="number"
                  min={1}
                  max={100}
                  value={editing.quantity}
                  onChange={(e) =>
                    setEditing({ ...editing, quantity: +e.target.value })
                  }
                />
              </Field>
            </div>
            {editing.type === "Bench" ? (
              <Field label="Available bench angles">
                <input
                  value={editing.angles ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, angles: e.target.value })
                  }
                />
              </Field>
            ) : (
              <Field
                label={
                  editing.type === "Resistance bands"
                    ? "Confirmed band ratings (lb nominal), comma separated"
                    : "Confirmed available weights (kg each), comma separated"
                }
              >
                <input
                  value={weights}
                  onChange={(e) => setWeights(e.target.value)}
                  placeholder="Leave blank if unknown"
                />
              </Field>
            )}
            {editing.type === "Dumbbells" && (
              <div className="form-grid">
                {(["min", "max", "increment"] as const).map((k) => (
                  <Field key={k} label={`${k} (kg, optional)`}>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      max="500"
                      value={editing[k] ?? ""}
                      onChange={(e) =>
                        setEditing({
                          ...editing,
                          [k]:
                            e.target.value === "" ? undefined : +e.target.value,
                        })
                      }
                    />
                  </Field>
                ))}
              </div>
            )}
            <p className="muted tiny">
              Recommendations use only confirmed weights above. A range or
              increment alone does not establish your available combinations.
            </p>
            {error && (
              <p role="alert" className="orange-text">
                {error}
              </p>
            )}
            <div className="row between modal-actions">
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  if (
                    window.confirm(
                      "Remove this equipment? Plans will be checked for available alternatives when you start.",
                    )
                  ) {
                    update((d) => ({
                      ...d,
                      equipment: d.equipment.filter((g) => g.id !== editing.id),
                    }));
                    setEditing(null);
                  }
                }}
              >
                <Trash2 size={15} /> Remove
              </Button>
              <Button type="submit">
                <Save size={16} /> Save equipment
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
export function Settings() {
  const { data, update, user, sync } = useApp();
  const [name, setName] = useState(data.name);
  const [saved, setSaved] = useState(false);
  const [authError, setAuthError] = useState("");
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MAKE FITFORGE YOURS</p>
          <h1>
            Your preferences<span className="blue">.</span>
          </h1>
        </div>
      </div>
      <div className="settings-grid">
        <section className="card">
          <h2>Profile & training</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              update((d) => ({ ...d, name: name.trim() }));
              setSaved(true);
            }}
          >
            <Field label="Your name">
              <input
                required
                maxLength={60}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSaved(false);
                }}
              />
            </Field>
            <Field label="Experience">
              <select
                value={data.experience}
                onChange={(e) =>
                  update((d) => ({ ...d, experience: e.target.value }))
                }
              >
                <option>Beginner</option>
                <option>Intermediate</option>
              </select>
            </Field>
            <p className="muted tiny">
              Experience is recorded for context. Your editable plan remains
              conservative; changing this does not silently increase training
              volume.
            </p>
            <Field label="Timezone">
              <input disabled value="Australia/Perth (UTC+08:00)" />
            </Field>
            <label className="check-row">
              <input
                type="checkbox"
                checked={data.autoRest}
                onChange={(e) =>
                  update((d) => ({ ...d, autoRest: e.target.checked }))
                }
              />{" "}
              Automatically start rest timer after sets
            </label>
            <h3>Training goals</h3>
            {["Biceps", "Chest", "Abs", "Legs", "Full-body fitness"].map(
              (g) => (
                <label key={g} className="check-row">
                  <input
                    type="checkbox"
                    checked={data.goals.includes(g)}
                    onChange={(e) =>
                      update((d) => ({
                        ...d,
                        goals: e.target.checked
                          ? [...d.goals, g]
                          : d.goals.filter((x) => x !== g),
                      }))
                    }
                  />
                  {g}
                </label>
              ),
            )}
            <Button type="submit">Save profile</Button>
            {saved && (
              <span role="status" className="green-text">
                {" "}
                Saved
              </span>
            )}
          </form>
        </section>
        <div>
          <section className="card">
            <h2>Storage & account</h2>
            <p className="notice">{sync}</p>
            <p className="muted">
              {supabase
                ? user?.email
                : "Local demo mode: data is saved only in this browser. Clearing browser storage will remove it. It is not cloud-synced."}
            </p>
            <Button
              variant="outline"
              onClick={() =>
                download(
                  `fitforge-backup-${new Date().toISOString().slice(0, 10)}.json`,
                  JSON.stringify(data, null, 2),
                )
              }
            >
              <Download size={16} /> Export full backup
            </Button>
            {supabase && (
              <Button
                variant="ghost"
                onClick={async () => {
                  const { error } = await supabase!.auth.signOut();
                  if (error) setAuthError(error.message);
                }}
              >
                <LogOut size={16} /> Sign out
              </Button>
            )}
            {authError && <p role="alert">{authError}</p>}
          </section>
          <section className="card finish-card">
            <h2>Install on your iPhone</h2>
            <p className="muted">
              Open FitForge in Safari, tap Share, then Add to Home Screen. Your
              training journal will open in its own app window.
            </p>
            <p className="tiny muted">
              An internet connection is needed to load the app. Once loaded,
              device autosave protects logged sets during connection
              interruptions.
            </p>
          </section>
          <section className="card finish-card">
            <h3>Your progress is personal</h3>
            <p className="muted">
              Exercise logging cannot determine body-fat percentage or guarantee
              visible abs. Body measurements are optional, user-entered records.
              Progress photos are not collected.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
