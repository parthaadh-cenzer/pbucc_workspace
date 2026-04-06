"use client";

import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold",
        "border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]",
        "transition hover:bg-[var(--color-surface-muted)]",
      )}
      aria-label="Toggle theme"
      title="Toggle theme"
    >
      {theme === "light" ? <MoonStar size={16} /> : <SunMedium size={16} />}
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}
