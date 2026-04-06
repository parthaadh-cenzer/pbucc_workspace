"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  CalendarDays,
  ClipboardList,
  LayoutDashboard,
  Link2,
  Megaphone,
  QrCode,
  SearchCheck,
} from "lucide-react";
import type { SidebarNavItem } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const iconByLabel: Record<string, ComponentType<{ size?: number }>> = {
  Dashboard: LayoutDashboard,
  "Ongoing Campaigns": Megaphone,
  Review: ClipboardList,
  "Social Review": ClipboardList,
  "Social Calendar": CalendarDays,
  "SEO Checker": SearchCheck,
  "QR Code Maker": QrCode,
  "URL Shortener": Link2,
};

export function Sidebar({ items }: { items: SidebarNavItem[] }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const matchesHref = (href: string) => {
    const [hrefPath, hrefQuery] = href.split("?");

    if (hrefQuery) {
      if (pathname !== hrefPath) {
        return false;
      }

      const expected = new URLSearchParams(hrefQuery);

      for (const [key, value] of expected.entries()) {
        if (searchParams.get(key) !== value) {
          return false;
        }
      }

      return true;
    }

    return pathname === hrefPath || (hrefPath !== "/marketing/dashboard" && pathname.startsWith(hrefPath));
  };

  return (
    <aside className="border-b border-[var(--color-border)] bg-[var(--color-surface)] lg:min-h-screen lg:border-b-0 lg:border-r">
      <div className="sticky top-0 flex h-full flex-col p-5">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-accent)]">
            PBUCC
          </p>
          <h2 className="mt-2 text-xl font-bold">Marketing Workspace</h2>
          <p className="mt-1 text-xs text-muted">Phase 1 Internal Prototype</p>
        </div>

        <nav className="grid gap-1.5">
          {items.map((item) => {
            const Icon = iconByLabel[item.label] ?? ClipboardList;
            const childActive = item.children?.some((child) => matchesHref(child.href)) ?? false;
            const isActive = matchesHref(item.href) || childActive;

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "inline-flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                    isActive
                      ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                      : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>

                {item.children && item.children.length > 0 ? (
                  <div className="mt-1 grid gap-1 border-l border-[var(--color-border)] pl-6">
                    {item.children.map((child) => {
                      const childIsActive = matchesHref(child.href);

                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={cn(
                            "inline-flex items-center rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
                            childIsActive
                              ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                              : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]",
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
