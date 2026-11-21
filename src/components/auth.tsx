"use client";
import { useState } from "react";
import { Flame, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "./ui/button";
import { Field } from "./common";
import { useApp } from "./provider";
export function Auth() {
  const { recovery, setRecovery } = useApp();
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <main className="auth-wrap">
      <div className="auth-card card">
        <div className="brand">
          <Flame /> FitForge<span>™</span>
        </div>
        <p className="eyebrow">YOUR STRONGER TOMORROW STARTS HERE</p>
        <h1>
          {recovery
            ? "Set a new password"
            : mode === "signup"
              ? "Build your foundation."
              : mode === "reset"
                ? "Let’s get you back in."
                : "Welcome back."}
        </h1>
        <p className="muted">
          Your home gym. A plan with purpose. Progress that’s yours.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!supabase) return;
            setBusy(true);
            setMessage("");
            try {
              if (recovery) {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                setRecovery(false);
                setMessage("Password updated.");
              } else if (mode === "reset") {
                const { error } = await supabase.auth.resetPasswordForEmail(
                  email,
                  { redirectTo: window.location.origin },
                );
                if (error) throw error;
                setMessage("Check your email for a password recovery link.");
              } else if (mode === "signup") {
                const { error } = await supabase.auth.signUp({
                  email,
                  password,
                  options: { emailRedirectTo: window.location.origin },
                });
                if (error) throw error;
                setMessage(
                  "Check your email to confirm your account, then sign in.",
                );
              } else {
                const { error } = await supabase.auth.signInWithPassword({
                  email,
                  password,
                });
                if (error) throw error;
              }
            } catch (err) {
              setMessage(
                err instanceof Error ? err.message : "Authentication failed",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          {!recovery && (
            <Field label="Email address">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          )}
          {(recovery || mode !== "reset") && (
            <Field label="Password (at least 8 characters)">
              <input
                type="password"
                minLength={8}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          <Button disabled={busy} className="full">
            {busy
              ? "Please wait…"
              : recovery
                ? "Update password"
                : mode === "login"
                  ? "Sign in"
                  : mode === "signup"
                    ? "Create account"
                    : "Send recovery email"}
            <ArrowRight size={17} />
          </Button>
        </form>
        <p role="status">{message}</p>
        {!recovery && (
          <div className="row wrap">
            <Button
              variant="ghost"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setMessage("");
              }}
            >
              {mode === "signup"
                ? "Already have an account? Sign in"
                : "Create an account"}
            </Button>
            <Button
              variant="ghost"
              onClick={() => setMode(mode === "reset" ? "login" : "reset")}
            >
              {mode === "reset" ? "Back to sign in" : "Forgot password?"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
