"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import type { User } from "@supabase/supabase-js";
import { freshData, catalog } from "@/lib/catalog";
import type { AppData } from "@/lib/types";
import { dataSchema } from "@/lib/validation";
import { supabase } from "@/lib/supabase";
type Context = {
  data: AppData;
  update: (fn: (d: AppData) => AppData) => boolean;
  user: User | null;
  loading: boolean;
  ready: boolean;
  sync: string;
  error: string;
  retry: () => void;
  recovery: boolean;
  setRecovery: (v: boolean) => void;
};
const State = createContext<Context | null>(null);
function parse(raw: unknown) {
  const result = dataSchema.parse(raw);
  if (
    result.plans.some((p) => p.exercises.some((e) => !catalog[e.exerciseId])) ||
    result.sessions.some((s) => s.logs.some((l) => !catalog[l.exerciseId]))
  )
    throw Error("Unknown exercise in saved data.");
  return result as AppData;
}
export function Provider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(freshData);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [sync, setSync] = useState(
    supabase ? "Connecting…" : "Local demo · cloud sync disabled",
  );
  const [error, setError] = useState("");
  const [recovery, setRecovery] = useState(false);
  const [retryKey, setRetry] = useState(0);
  const current = useRef(data);
  const revision = useRef(0);
  const saved = useRef(0);
  const key = useRef("fitforge-demo-v1");
  const uid = useRef<string | null>(null);
  const update = useCallback((fn: (d: AppData) => AppData) => {
    try {
      const next = parse(fn(structuredClone(current.current)));
      localStorage.setItem(
        key.current,
        JSON.stringify({
          data: next,
          dirty: !!supabase,
          updatedAt: Date.now(),
        }),
      );
      current.current = next;
      revision.current++;
      setData(next);
      setError("");
      setSync(
        supabase
          ? "Saved on device · sync pending"
          : "Local demo · saved on this device",
      );
      return true;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save your changes.");
      return false;
    }
  }, []);
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    let live = true;
    supabase.auth.getSession().then(({ data, error }) => {
      if (!live) return;
      setUser((previous) =>
        previous?.id === data.session?.user?.id
          ? previous
          : (data.session?.user ?? null),
      );
      setLoading(false);
      if (error) setError(error.message);
    });
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser((previous) =>
          previous?.id === session?.user?.id
            ? previous
            : (session?.user ?? null),
        );
        setLoading(false);
        if (event === "PASSWORD_RECOVERY") setRecovery(true);
      },
    );
    return () => {
      live = false;
      listener.subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    if (loading) return;
    let live = true;
    setReady(false);
    uid.current = user?.id ?? null;
    key.current = user ? `fitforge-user-${user.id}` : "fitforge-demo-v1";
    revision.current = 0;
    saved.current = 0;
    async function load() {
      try {
        const raw = localStorage.getItem(key.current);
        const local = raw ? JSON.parse(raw) : null;
        if (supabase && user) {
          const { data: row, error } = await supabase
            .from("user_preferences")
            .select("state")
            .eq("user_id", user.id)
            .maybeSingle();
          if (!live) return;
          if (error) {
            if (local) {
              const next = parse(local.data);
              current.current = next;
              setData(next);
              revision.current = 1;
              setReady(true);
            }
            throw Error(
              `Cloud unavailable: ${error.message}. Device changes are retained.`,
            );
          }
          const next = local?.dirty
            ? parse(local.data)
            : row
              ? parse(row.state)
              : local
                ? parse(local.data)
                : freshData();
          current.current = next;
          setData(next);
          if (local?.dirty || !row) revision.current = 1;
          setSync(
            local?.dirty ? "Device changes awaiting sync" : "Cloud connected",
          );
        } else {
          const next = local ? parse(local.data) : freshData();
          if (!live) return;
          current.current = next;
          setData(next);
        }
        setReady(true);
        setError("");
      } catch (e) {
        if (live)
          setError(e instanceof Error ? e.message : "Unable to load data.");
      }
    }
    void load();
    return () => {
      live = false;
    };
  }, [user, loading, retryKey]);
  useEffect(() => {
    if (!supabase || !user || !ready) return;
    let busy = false;
    const client = supabase;
    const userId = user.id;
    const storageKey = key.current;
    const timer = setInterval(async () => {
      if (busy || saved.current === revision.current || uid.current !== userId)
        return;
      busy = true;
      const rev = revision.current;
      const snapshot = current.current;
      const { error } = await client.from("user_preferences").upsert(
        {
          user_id: userId,
          state: snapshot,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (uid.current === userId) {
        if (error) {
          setSync("Not synced · retrying");
          setError(error.message);
        } else {
          saved.current = rev;
          setSync(rev === revision.current ? "Cloud synced" : "Sync pending");
          setError("");
          if (rev === revision.current)
            localStorage.setItem(
              storageKey,
              JSON.stringify({
                data: snapshot,
                dirty: false,
                updatedAt: Date.now(),
              }),
            );
        }
      }
      busy = false;
    }, 1500);
    return () => clearInterval(timer);
  }, [user, ready]);
  return (
    <State.Provider
      value={{
        data,
        update,
        user,
        loading,
        ready,
        sync,
        error,
        retry: () => setRetry((v) => v + 1),
        recovery,
        setRecovery,
      }}
    >
      {children}
    </State.Provider>
  );
}
export function useApp() {
  const ctx = useContext(State);
  if (!ctx) throw Error("Provider required");
  return ctx;
}
