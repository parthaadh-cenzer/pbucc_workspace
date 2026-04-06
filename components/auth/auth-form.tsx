"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AuthMode = "login" | "register";

export function AuthForm() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("register");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const subtitle = useMemo(() => {
    if (mode === "login") {
      return "Sign in to continue to your private workspace memory and dashboard.";
    }

    return "Create your account with a team assignment to initialize your isolated workspace.";
  }, [mode]);

  const resetError = () => {
    if (error) {
      setError("");
    }
  };

  const handleLogin = async () => {
    const result = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid username or password.");
      return;
    }

    router.push("/marketing/dashboard");
    router.refresh();
  };

  const handleRegister = async () => {
    const payload = {
      username,
      password,
      confirmPassword,
    };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Unable to register user.");
      return;
    }

    const loginResult = await signIn("credentials", {
      username,
      password,
      redirect: false,
    });

    if (loginResult?.error) {
      setError("Account created, but automatic login failed. Please log in.");
      setMode("login");
      return;
    }

    router.push("/marketing/dashboard");
    router.refresh();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      if (mode === "login") {
        await handleLogin();
      } else {
        await handleRegister();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="w-full max-w-xl p-7 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
        Workspace Access
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">
        {mode === "register" ? "Register" : "Login"}
      </h1>
      <p className="mt-2 text-sm text-muted">{subtitle}</p>

      <div className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-1">
        <button
          type="button"
          onClick={() => {
            setMode("register");
            resetError();
          }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "register"
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text)]"
          }`}
        >
          Register
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("login");
            resetError();
          }}
          className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
            mode === "login"
              ? "bg-[var(--color-accent)] text-white"
              : "text-[var(--color-text)]"
          }`}
        >
          Login
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.09em] text-muted">
            Username
          </span>
          <input
            value={username}
            onChange={(event) => {
              resetError();
              setUsername(event.target.value);
            }}
            required
            autoComplete="username"
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:accent-ring"
            placeholder="your.username"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.09em] text-muted">
            Password
          </span>
          <input
            value={password}
            onChange={(event) => {
              resetError();
              setPassword(event.target.value);
            }}
            type="password"
            required
            minLength={8}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:accent-ring"
            placeholder="Minimum 8 characters"
          />
        </label>

        {mode === "register" ? (
          <>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-[0.09em] text-muted">
                Confirm Password
              </span>
              <input
                value={confirmPassword}
                onChange={(event) => {
                  resetError();
                  setConfirmPassword(event.target.value);
                }}
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:accent-ring"
                placeholder="Re-enter password"
              />
            </label>

            <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.09em] text-muted">
                Workspace Assignment
              </p>

              <div className="mt-3 space-y-3">
                <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm">
                  Marketing workspace (restricted)
                </p>
              </div>
            </div>
          </>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? "Working..."
            : mode === "register"
              ? "Create Account"
              : "Login"}
        </Button>
      </form>
    </Card>
  );
}
