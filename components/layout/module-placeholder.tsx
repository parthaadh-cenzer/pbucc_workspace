import { Card } from "@/components/ui/card";

export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="p-7">
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>

      <div className="mt-5 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)] p-6">
        <p className="text-sm font-semibold">Phase 1 Foundation Ready</p>
        <p className="mt-1 text-sm text-muted">
          This module page is intentionally scaffolded only. Functional workflows will
          be implemented in future phases.
        </p>
      </div>
    </Card>
  );
}
