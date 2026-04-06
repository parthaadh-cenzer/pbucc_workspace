import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type StatCardProps = {
  title: string;
  value: string;
  meta: string;
  icon: LucideIcon;
};

export function StatCard({ title, value, meta, icon: Icon }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-sm text-muted">{title}</p>
          <p className="text-3xl font-bold leading-none tracking-tight">{value}</p>
          <p className="text-xs text-muted">{meta}</p>
        </div>

        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Icon size={18} />
        </div>
      </div>
    </Card>
  );
}
