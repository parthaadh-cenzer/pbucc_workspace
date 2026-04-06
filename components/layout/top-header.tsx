"use client";

import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme/theme-toggle";

const pageTitleMap: Record<string, string> = {
  "/marketing/dashboard": "Dashboard",
  "/marketing/ongoing-campaigns": "Ongoing Campaigns",
  "/marketing/social-review": "Social Review",
  "/marketing/social-calendar": "Social Calendar",
  "/marketing/seo-checker": "SEO Checker",
  "/marketing/qr-code-maker": "QR Code Maker",
  "/marketing/url-shortener": "URL Shortener",
  "/marketing/review": "Review",
  "/marketing/team": "Team Member Profile",
};

export function TopHeader({
  teamName,
  userName,
}: {
  teamName: string;
  userName: string;
}) {
  const pathname = usePathname();
  const pageTitle = pathname.startsWith("/marketing/ongoing-campaigns/")
    ? pathname.endsWith("/create")
      ? "Create Campaign"
      : "Campaign Report"
    : pathname.startsWith("/marketing/team/")
      ? "Team Member Profile"
    : pageTitleMap[pathname] ?? "Workspace";
  const initials = userName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)] px-6 py-4 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
          <div className="mt-1">
            <Badge>{teamName}</Badge>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <NotificationBell />
          <ThemeToggle />
          <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-xs font-bold text-[var(--color-accent)]">
              {initials || "WU"}
            </div>
            <div className="pr-1">
              <p className="text-xs font-semibold">{userName}</p>
              <p className="text-[11px] text-muted">Profile</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/auth" })}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-xs font-semibold transition hover:bg-[var(--color-surface-muted)]"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
