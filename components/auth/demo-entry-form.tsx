"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useDemoUser } from "@/components/demo/demo-user-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function DemoEntryForm() {
  const router = useRouter();
  const {
    teams,
    selectedTeam,
    availableUsers,
    currentUser,
    setSelectedTeam,
    setCurrentUser,
    clearSelection,
  } = useDemoUser();
  const [error, setError] = useState("");

  const step = useMemo(() => {
    if (!selectedTeam) {
      return 1;
    }

    if (!currentUser) {
      return 2;
    }

    return 3;
  }, [currentUser, selectedTeam]);

  const handleTeamSelect = (teamId: string) => {
    setError("");
    const selected = setSelectedTeam(teamId);

    if (!selected) {
      setError("Unable to select team right now.");
    }
  };

  const handleUserSelect = (userId: string) => {
    setError("");
    const selected = setCurrentUser(userId);

    if (!selected) {
      setError("Unable to select user for this team.");
    }
  };

  const enterWorkspace = () => {
    if (!selectedTeam || !currentUser) {
      setError("Select team and user before entering workspace.");
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

      <h1 className="mt-3 text-3xl font-bold tracking-tight">Select Workspace</h1>
      <p className="mt-2 text-sm text-muted">
        Demo mode is enabled. Select team and user to enter your workspace.
      </p>

      <div className="mt-5 space-y-4">
        <div className="grid grid-cols-3 gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
          <span className={step >= 1 ? "text-[var(--color-accent)]" : ""}>1. Team</span>
          <span className={step >= 2 ? "text-[var(--color-accent)]" : ""}>2. User</span>
          <span className={step >= 3 ? "text-[var(--color-accent)]" : ""}>3. Enter</span>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.09em] text-muted">
            Select Team
          </p>
          <div className="space-y-2">
            {teams.map((team) => {
              const active = selectedTeam?.id === team.id;

              return (
                <button
                  key={team.id}
                  type="button"
                  onClick={() => handleTeamSelect(team.id)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                    active
                      ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                      : "border-[var(--color-border)] bg-[var(--color-surface)]"
                  }`}
                >
                  <p className="font-semibold">{team.name}</p>
                  <p className="text-xs text-muted">{team.description}</p>
                </button>
              );
            })}
          </div>
        </div>

        {selectedTeam ? (
          <div>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.09em] text-muted">
                Select User
              </p>
              <button
                type="button"
                onClick={() => clearSelection()}
                className="text-xs font-semibold text-[var(--color-accent)]"
              >
                Change Team
              </button>
            </div>

            <div className="space-y-2">
              {availableUsers.map((user) => {
                const active = currentUser?.id === user.id;

                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleUserSelect(user.id)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-left text-sm transition ${
                      active
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : "border-[var(--color-border)] bg-[var(--color-surface)]"
                    }`}
                  >
                    <p className="font-semibold">{user.name}</p>
                    <p className="text-xs text-muted">{user.role}</p>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          onClick={enterWorkspace}
          variant="primary"
          className="w-full"
          disabled={!selectedTeam || !currentUser}
        >
          Enter Workspace
        </Button>
      </div>
    </Card>
  );
}
