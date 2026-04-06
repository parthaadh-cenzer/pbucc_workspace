import {
  CheckCircle2,
  CircleEllipsis,
  FileSearch,
  Link2,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { OngoingCampaignsSection } from "@/components/campaigns/ongoing-campaigns-section";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { TeamMembersList } from "@/components/dashboard/team-members-list";
import { getDemoWorkspaceSelectionFromCookies } from "@/lib/demo-mode";
import { listWorkspaceUsersForTeam, workspaceTeams } from "@/lib/mock-users";
import {
  dashboardStats,
  quickActions,
  recentActivity,
  type DashboardStat,
} from "@/lib/mock-data";

const iconByStatId: Record<DashboardStat["id"], LucideIcon> = {
  activeCampaigns: Megaphone,
  pendingSocialReviews: CircleEllipsis,
  approvedPostsThisWeek: CheckCircle2,
  seoDocsWaiting: FileSearch,
  recentShortLinks: Link2,
};

export default async function MarketingDashboardPage() {
  const selection = await getDemoWorkspaceSelectionFromCookies();
  const fallbackTeamId = workspaceTeams[0]?.id ?? "marketing";
  const activeTeamId = selection?.team.id ?? fallbackTeamId;
  const teamMembers = listWorkspaceUsersForTeam(activeTeamId).map((member) => ({
    id: member.id,
    initials: member.initials,
    name: member.name,
    role: member.role,
  }));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {dashboardStats.map((stat) => (
          <StatCard
            key={stat.id}
            title={stat.label}
            value={stat.value}
            meta={stat.meta}
            icon={iconByStatId[stat.id]}
          />
        ))}
      </section>

      <section>
        <OngoingCampaignsSection compact />
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <QuickActions actions={quickActions} />
          <RecentActivityList items={recentActivity} />
        </div>

        <div>
          <TeamMembersList members={teamMembers} compact />
        </div>
      </section>
    </div>
  );
}
