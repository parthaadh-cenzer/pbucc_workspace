"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useDemoUser } from "@/components/demo/demo-user-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DemoEntryForm() {
  const router = useRouter();
  const { setCurrentUserByUsername } = useDemoUser();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const matched = setCurrentUserByUsername(username);

    if (!matched) {
      setError("Username not recognized. Use Partha or Test Admin.");
      return;
    }

    router.push("/marketing/dashboard");
    router.refresh();
  };

  return (
    <Card className="w-full max-w-xl p-7 md:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
        Workspace Access
      </p>

      <h1 className="mt-3 text-3xl font-bold tracking-tight">Enter Workspace</h1>
      <p className="mt-2 text-sm text-muted">
        Demo mode is enabled. Enter your workspace username to continue.
      </p>

      <form onSubmit={handleSubmit} className="mt-5 space-y-4">
        <label className="block space-y-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.09em] text-muted">
            Enter Your Username
          </span>
          <input
            value={username}
            onChange={(event) => {
              setError("");
              setUsername(event.target.value);
            }}
            required
            className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 py-2.5 text-sm outline-none focus:accent-ring"
            placeholder="Partha"
          />
        </label>

        <p className="text-xs text-muted">
          Allowed users: Partha, Test Admin
        </p>

        {error ? (
          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <Button type="submit" variant="primary" className="w-full">
          Enter Workspace
        </Button>
      </form>
    </Card>
  );
}
