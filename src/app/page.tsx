"use client";
import { useCallback, useEffect, useState } from "react";
import {
  Flame,
  LayoutDashboard,
  Dumbbell,
  CalendarDays,
  BookOpen,
  TrendingUp,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Menu,
  X,
  ChevronRight,
  Cloud,
  HardDrive,
} from "lucide-react";
import { Provider, useApp } from "@/components/provider";
import { Auth } from "@/components/auth";
import { Onboarding } from "@/components/onboarding";
import { Dashboard } from "@/components/dashboard";
import { WeeklyPlan, Library } from "@/components/plan-library";
import { Workout } from "@/components/workout";
import { Progress } from "@/components/progress";
import { History } from "@/components/history";
import { EquipmentPage, Settings } from "@/components/equipment-settings";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { today, available, adaptPlan } from "@/lib/engine";
import { catalog } from "@/lib/catalog";
import type { Plan, Session } from "@/lib/types";
const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "workout", label: "My Workout", icon: Dumbbell },
  { id: "plan", label: "Weekly Plan", icon: CalendarDays },
  { id: "library", label: "Exercise Library", icon: BookOpen },
  { id: "progress", label: "Progress", icon: TrendingUp },
  { id: "history", label: "History", icon: HistoryIcon },
  { id: "equipment", label: "Equipment", icon: Dumbbell },
  { id: "settings", label: "Settings", icon: SettingsIcon },
];
export default function Page() {
  return (
    <Provider>
      <App />
    </Provider>
  );
}
function App() {
  const { data, update, user, loading, ready, sync, error, retry, recovery } =
    useApp();
  const [page, setPage] = useState("dashboard");
  const [menu, setMenu] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const onHash = () => {
      const hash = window.location.hash.slice(1);
      if (nav.some((n) => n.id === hash)) setPage(hash);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (id: string) => {
    setPage(id);
    setMenu(false);
    window.history.pushState(null, "", "#" + id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const start = useCallback(
    (original: Plan, light = false) => {
      if (
        data.sessions.some(
          (s) => s.status === "active" || s.status === "paused",
        )
      ) {
        navigate("workout");
        setNotice(
          "Your unfinished session is ready to resume. Finish or abandon it before starting another.",
        );
        return;
      }
      const plan = adaptPlan(original, data.equipment);
      const missing = plan.exercises.filter(
        (p) => !available(catalog[p.exerciseId], data.equipment),
      );
      if (missing.length) {
        setNotice(
          `Update your plan or equipment before starting: ${missing.map((p) => catalog[p.exerciseId].name).join(", ")} cannot be performed with your available equipment.`,
        );
        return;
      }
      const s: Session = {
        id: crypto.randomUUID(),
        planId: plan.id,
        name: plan.name + (light ? " · lighter" : ""),
        date: today(),
        startedAt: new Date().toISOString(),
        status: "active",
        elapsed: 0,
        lastResumedAt: Date.now(),
        logs: [],
        exercises: plan.exercises.map((p) =>
          light ? { ...p, sets: 1, weight: undefined } : p,
        ),
        notes: "",
        recovery: light ? "poor" : "good",
      };
      update((d) => ({ ...d, sessions: [...d.sessions, s] }));
      navigate("workout");
    },
    [data, update],
  );
  if (loading)
    return (
      <main className="loading">
        <Flame size={40} />
        <p>Getting your gym ready…</p>
      </main>
    );
  if (supabase && (!user || recovery)) return <Auth />;
  if (!ready)
    return (
      <main className="loading">
        <p>{error || "Loading your training journal…"}</p>
        {error && <Button onClick={retry}>Retry connection</Button>}
      </main>
    );
  if (!data.onboarded)
    return (
      <>
        <div className="demo-banner">
          {supabase
            ? "Cloud account connected"
            : "LOCAL DEMO · Saved in this browser only · Cloud sync disabled"}
        </div>
        <Onboarding />
      </>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className={`sidebar ${menu ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-icon">
            <Flame size={23} />
          </span>
          FitForge<span>™</span>
          <button
            className="mobile-close"
            aria-label="Close navigation"
            onClick={() => setMenu(false)}
          >
            <X size={20} />
          </button>
        </div>
        <p className="nav-label">YOUR TRAINING SPACE</p>
        <nav aria-label="Main navigation">
          {nav.map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              aria-current={page === n.id ? "page" : undefined}
              className={page === n.id ? "active" : ""}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} />
              {n.label}
              {page === n.id && <span className="nav-dot" />}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="foundation">
            <span className="eyebrow blue">BUILT, NOT BORN.</span>
            <p>
              One more rep.
              <br />
              One stronger you.
            </p>
            <span className="tiny muted">Your home. Your gym. Your pace.</span>
          </div>
          <button className="profile" onClick={() => navigate("settings")}>
            <span className="avatar">
              {data.name.slice(0, 1).toUpperCase()}
            </span>
            <span>
              {data.name}
              <small>{data.experience} · Home athlete</small>
            </span>
            <ChevronRight size={16} />
          </button>
        </div>
      </aside>
      {menu && <div className="menu-scrim" onClick={() => setMenu(false)} />}
      <div className="main-shell">
        <header className="topbar">
          <div className="row">
            <button
              className="mobile-menu"
              aria-label="Open navigation"
              onClick={() => setMenu(true)}
            >
              <Menu size={23} />
            </button>
            <span className="breadcrumb">
              Your space <ChevronRight size={12} />{" "}
              <strong>{nav.find((n) => n.id === page)?.label}</strong>
            </span>
          </div>
          <span className={`sync-status ${supabase ? "" : "demo"}`}>
            {supabase ? <Cloud size={14} /> : <HardDrive size={14} />}
            <span>{sync}</span>
          </span>
        </header>
        <main id="main" className="main-content">
          {(notice || error) && (
            <div className="notice orange" role="status">
              {error || notice}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => (error ? retry() : setNotice(""))}
              >
                {error ? "Retry" : "Dismiss"}
              </Button>
            </div>
          )}
          {page === "dashboard" && (
            <Dashboard start={start} navigate={navigate} />
          )}
          {page === "workout" && <Workout start={start} />}
          {page === "plan" && <WeeklyPlan start={start} />}
          {page === "library" && <Library />}
          {page === "progress" && <Progress />}
          {page === "history" && <History start={start} />}
          {page === "equipment" && <EquipmentPage />}
          {page === "settings" && <Settings />}
          <footer className="footer">
            <span>
              FITFORGE <i> / </i> PROGRESS IS A PRACTICE.
            </span>
            <span>Made for the long game.</span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav" aria-label="Mobile navigation">
        {nav
          .filter((n) =>
            ["dashboard", "workout", "plan", "progress"].includes(n.id),
          )
          .map((n) => (
            <a
              key={n.id}
              href={`#${n.id}`}
              className={page === n.id ? "active" : ""}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={20} />
              <span>
                {n.id === "dashboard"
                  ? "Home"
                  : n.id === "plan"
                    ? "Plan"
                    : n.id === "workout"
                      ? "Train"
                      : n.label}
              </span>
            </a>
          ))}
        <button onClick={() => setMenu(true)}>
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
    </div>
  );
}
