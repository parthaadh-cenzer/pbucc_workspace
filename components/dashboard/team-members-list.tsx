import Link from "next/link";
type TeamMemberListItem = {
  id: string | number;
  initials: string;
  name: string;
  role: string;
};
import { Card } from "@/components/ui/card";

export function TeamMembersList({
  members,
  compact,
}: {
  members: TeamMemberListItem[];
  compact?: boolean;
}) {
  return (
    <Card className="p-5">
      <h2 className="text-lg font-semibold">Team Members</h2>
      <p className="mt-1 text-sm text-muted">Core Marketing workspace contributors.</p>

      <div className="mt-4 space-y-3">
        {members.map((member) => (
          <Link
            key={member.id}
            href={`/marketing/team/${member.id}`}
            className="flex items-center gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2.5"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-xs font-bold text-[var(--color-accent)]">
              {member.initials}
            </div>
            <div className={compact ? "leading-snug" : ""}>
              <p className="text-sm font-semibold">{member.name}</p>
              <p className="text-xs text-muted">{member.role}</p>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
