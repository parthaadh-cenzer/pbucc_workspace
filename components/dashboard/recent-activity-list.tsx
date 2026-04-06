import { Clock3 } from "lucide-react";
import type { ActivityItem } from "@/lib/mock-data";
import { Card } from "@/components/ui/card";

export function RecentActivityList({
  items,
}: {
  items: ActivityItem[];
}) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Recent Activity</h2>
      <p className="mt-1 text-sm text-muted">Latest updates from team workflows.</p>

      <div className="mt-5 space-y-4">
        {items.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3.5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold">{item.title}</p>
                <p className="mt-1 text-xs text-muted">{item.detail}</p>
              </div>
              <span className="mt-0.5 h-2.5 w-2.5 rounded-full bg-[var(--color-accent)]" />
            </div>

            <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted">
              <Clock3 size={12} />
              {item.time}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
