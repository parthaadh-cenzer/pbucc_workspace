"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { useDemoUser } from "@/components/demo/demo-user-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type {
  WorkspaceMemberProfilePayload,
  WorkspaceTaskRecord,
  WorkspaceTaskStatusLabel,
} from "@/lib/workspace-task-types";

type CreateTaskFormState = {
  title: string;
  description: string;
  status: WorkspaceTaskStatusLabel;
  dueDate: string;
  freshdeskTicket: string;
};

const initialFormState: CreateTaskFormState = {
  title: "",
  description: "",
  status: "Upcoming",
  dueDate: "",
  freshdeskTicket: "",
};

function formatDueDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function statusClass(status: WorkspaceTaskStatusLabel) {
  if (status === "Ongoing") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
  }

  return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
}

function TaskListSection({
  title,
  emptyText,
  tasks,
}: {
  title: string;
  emptyText: string;
  tasks: WorkspaceTaskRecord[];
}) {
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-muted">{title}</h3>

      <div className="mt-3 space-y-2">
        {tasks.length < 1 ? (
          <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm text-muted">
            {emptyText}
          </p>
        ) : (
          tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold">{task.title}</p>
                <span
                  className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass(task.status)}`}
                >
                  {task.status}
                </span>
              </div>

              {task.description ? <p className="mt-1 text-xs text-muted">{task.description}</p> : null}

              <div className="mt-2 grid gap-1 text-[11px] text-muted sm:grid-cols-2">
                <p>Due: {formatDueDate(task.dueDate)}</p>
                <p>Created by: {task.createdByName}</p>
                {task.freshdeskTicket ? <p>Freshdesk: {task.freshdeskTicket}</p> : null}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}

export function MemberProfileWorkspace({
  initialProfile,
  currentUserName,
  demoMode = false,
}: {
  initialProfile: WorkspaceMemberProfilePayload;
  currentUserName: string;
  demoMode?: boolean;
}) {
  const { currentUser } = useDemoUser();
  const [tasks, setTasks] = useState<WorkspaceTaskRecord[]>(initialProfile.tasks);
  const [form, setForm] = useState<CreateTaskFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const demoTaskStorageKey =
    demoMode && currentUser
      ? `workspace-demo-tasks:${currentUser.id}:${initialProfile.member.id}`
      : null;

  useEffect(() => {
    if (!demoMode) {
      setTasks(initialProfile.tasks);
      return;
    }

    if (!demoTaskStorageKey) {
      setTasks([]);
      return;
    }

    try {
      const saved = window.localStorage.getItem(demoTaskStorageKey);

      if (saved) {
        const parsed = JSON.parse(saved) as WorkspaceTaskRecord[];
        setTasks(parsed);
      } else {
        setTasks(initialProfile.tasks);
      }
    } catch {
      setTasks(initialProfile.tasks);
    }
  }, [demoMode, demoTaskStorageKey, initialProfile.tasks]);

  useEffect(() => {
    if (!demoMode || !demoTaskStorageKey) {
      return;
    }

    window.localStorage.setItem(demoTaskStorageKey, JSON.stringify(tasks));
  }, [demoMode, demoTaskStorageKey, tasks]);

  const ongoingTasks = useMemo(
    () => tasks.filter((task) => task.status === "Ongoing"),
    [tasks],
  );

  const upcomingTasks = useMemo(
    () => tasks.filter((task) => task.status === "Upcoming"),
    [tasks],
  );

  const handleCreateTask = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!form.title.trim()) {
      setError("Task title is required.");
      return;
    }

    if (!form.dueDate) {
      setError("Due date is required.");
      return;
    }

    setIsSubmitting(true);

    try {
      if (demoMode) {
        const localTask: WorkspaceTaskRecord = {
          id: `demo-task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          title: form.title.trim(),
          description: form.description.trim() || null,
          status: form.status,
          dueDate: new Date(`${form.dueDate}T00:00:00Z`).toISOString(),
          freshdeskTicket: form.freshdeskTicket.trim() || null,
          assigneeId: typeof initialProfile.member.id === "number" ? initialProfile.member.id : 0,
          assigneeName: initialProfile.member.name,
          createdById: 0,
          createdByName: currentUserName,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setTasks((previous) => [localTask, ...previous]);
        setForm(initialFormState);
        return;
      }

      const response = await fetch(`/api/members/${initialProfile.member.id}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description,
          status: form.status,
          dueDate: form.dueDate,
          freshdeskTicket: form.freshdeskTicket,
        }),
      });

      const payload = (await response.json()) as {
        error?: string;
        task?: WorkspaceTaskRecord;
      };

      if (!response.ok || !payload.task) {
        setError(payload.error ?? "Unable to create task.");
        return;
      }

      setTasks((previous) => [payload.task as WorkspaceTaskRecord, ...previous]);
      setForm(initialFormState);
    } catch {
      setError("Unable to create task right now.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{initialProfile.member.name}</h2>
            <p className="mt-1 text-sm text-muted">{initialProfile.member.role}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
              {initialProfile.member.teamName} Workspace
            </p>
          </div>

          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-xs text-muted">
            Viewing as {currentUserName}
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <Plus size={16} />
          <h3 className="text-lg font-semibold">Create Task</h3>
        </div>

        <form onSubmit={handleCreateTask} className="grid gap-3 lg:grid-cols-2">
          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Task title *</span>
            <input
              value={form.title}
              onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
              placeholder="Enter task title"
            />
          </label>

          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Task description</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
              placeholder="Optional description"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Task status *</span>
            <select
              value={form.status}
              onChange={(event) =>
                setForm((previous) => ({
                  ...previous,
                  status: event.target.value as WorkspaceTaskStatusLabel,
                }))
              }
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
            >
              <option value="Ongoing">Ongoing</option>
              <option value="Upcoming">Upcoming</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Due date *</span>
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => setForm((previous) => ({ ...previous, dueDate: event.target.value }))}
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Freshdesk ticket number</span>
            <input
              value={form.freshdeskTicket}
              onChange={(event) =>
                setForm((previous) => ({ ...previous, freshdeskTicket: event.target.value }))
              }
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Assignee</span>
            <input
              value={initialProfile.member.name}
              readOnly
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2.5 text-sm"
            />
          </label>

          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-xs font-semibold uppercase tracking-[0.08em] text-muted">Created by</span>
            <input
              value={currentUserName}
              readOnly
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2.5 text-sm"
            />
          </label>

          {error ? (
            <p className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300 lg:col-span-2">
              {error}
            </p>
          ) : null}

          <div className="lg:col-span-2">
            <Button variant="primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Task"}
            </Button>
          </div>
        </form>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <TaskListSection
          title="Currently Working On"
          emptyText="No ongoing tasks for this member."
          tasks={ongoingTasks}
        />
        <TaskListSection
          title="Upcoming Tasks"
          emptyText="No upcoming tasks for this member."
          tasks={upcomingTasks}
        />
      </div>
    </div>
  );
}
