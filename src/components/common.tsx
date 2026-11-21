"use client";
import { useEffect, useRef } from "react";
import { X, ArrowUpRight } from "lucide-react";
import { Button } from "./ui/button";
import { ExerciseAnimation } from "./exercise-player";
import { catalog } from "@/lib/catalog";
import type { Exercise } from "@/lib/types";
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    el?.showModal();
    return () => el?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-header">
        <h2>{title}</h2>
        <Button variant="ghost" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </Button>
      </div>
      {children}
    </dialog>
  );
}
export function Guide({
  exercise,
  onClose,
}: {
  exercise: Exercise;
  onClose: () => void;
}) {
  return (
    <Modal title={exercise.name} onClose={onClose}>
      <ExerciseAnimation key={exercise.id} exercise={exercise} />
      <div className="chips">
        <span>{exercise.primary}</span>
        {exercise.secondary.map((m) => (
          <span key={m}>{m}</span>
        ))}
      </div>
      <p className="muted">
        {exercise.gear.join(" + ")} ·{" "}
        {exercise.unilateral ? "Complete both sides" : "Controlled movement"}
      </p>
      <h3>How to perform</h3>
      <ol className="instructions">
        {exercise.steps.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ol>
      <details className="simple-details">
        <summary>Form tips, breathing & alternatives</summary>
        <div className="info-grid">
          <div>
            <h4>Common mistake</h4>
            <p>{exercise.mistake}</p>
          </div>
          <div>
            <h4>Breathing</h4>
            <p>{exercise.breath}</p>
          </div>
          <div>
            <h4>Make it easier</h4>
            <p>{exercise.easy}</p>
          </div>
          <div>
            <h4>Next challenge</h4>
            <p>{exercise.hard}</p>
          </div>
        </div>
      </details>
      <p className="notice orange">{exercise.safety}</p>
      <p className="tiny muted">
        Original schematic illustrations. Use the written cues alongside the
        diagram; illustrations are not a form assessment.
      </p>
    </Modal>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <ArrowUpRight size={28} />
      <h3>{title}</h3>
      <div className="muted">{children}</div>
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export const exerciseName = (id: string) => catalog[id]?.name ?? id;
export const minutes = (s: number) =>
  `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
export const dateLabel = (date: string) =>
  new Date(date + "T12:00:00+08:00").toLocaleDateString("en-AU", {
    timeZone: "Australia/Perth",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
