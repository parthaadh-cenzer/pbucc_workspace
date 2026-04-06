"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { useNotifications, type NotificationSource } from "@/components/notifications/notifications-provider";

function sourceClass(source: NotificationSource) {
  if (source === "Review") {
    return "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300";
  }

  if (source === "Social Review") {
    return "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300";
  }

  if (source === "Campaign") {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300";
  }

  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
}

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp);
  const diff = Date.now() - date.getTime();
  const minute = 1000 * 60;
  const hour = minute * 60;
  const day = hour * 24;

  if (diff < minute) {
    return "Just now";
  }

  if (diff < hour) {
    return `${Math.max(1, Math.floor(diff / minute))}m ago`;
  }

  if (diff < day) {
    return `${Math.max(1, Math.floor(diff / hour))}h ago`;
  }

  return `${Math.max(1, Math.floor(diff / day))}d ago`;
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();

  const sortedNotifications = useMemo(
    () => [...notifications].sort((a, b) => b.timestamp.localeCompare(a.timestamp)),
    [notifications],
  );

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      if (!containerRef.current) {
        return;
      }

      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutside);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
    };
  }, []);

  const handleOpenItem = (id: string, href: string) => {
    markAsRead(id);
    setOpen(false);
    router.push(href);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((previous) => !previous)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] transition hover:bg-[var(--color-surface-muted)]"
        aria-label="Open notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--color-accent)] px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+10px)] z-40 w-[360px] rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              type="button"
              onClick={markAllAsRead}
              className="text-xs font-semibold text-[var(--color-accent)]"
            >
              Mark all read
            </button>
          </div>

          <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
            {sortedNotifications.length < 1 ? (
              <p className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm text-muted">
                No notifications yet.
              </p>
            ) : (
              sortedNotifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleOpenItem(item.id, item.href)}
                  className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-left transition hover:border-[var(--color-accent)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{item.message}</p>
                    </div>
                    {item.unread ? (
                      <span className="mt-1 inline-flex h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
                    ) : null}
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${sourceClass(item.source)}`}
                    >
                      {item.source}
                    </span>
                    <span className="text-[11px] text-muted">{formatRelativeTime(item.timestamp)}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
