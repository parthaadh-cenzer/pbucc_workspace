import {
  CheckCircle2,
  CircleEllipsis,
  FileSearch,
  Link2,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { redirect } from "next/navigation";
import { OngoingCampaignsSection } from "@/components/campaigns/ongoing-campaigns-section";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { RecentActivityList } from "@/components/dashboard/recent-activity-list";
import { StatCard } from "@/components/dashboard/stat-card";
import { TeamMembersList } from "@/components/dashboard/team-members-list";
import { getDemoWorkspaceUserFromCookies, isDemoModeEnabled } from "@/lib/demo-mode";
import { workspaceUsers } from "@/lib/mock-users";
import { getMarketingSessionUser } from "@/lib/security";
import { listWorkspaceMembers } from "@/lib/workspace-members";
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
  const demoMode = isDemoModeEnabled();
  let teamMembers: Array<{ id: string | number; initials: string; name: string; role: string }> = [];

  if (demoMode) {
    const demoUser = await getDemoWorkspaceUserFromCookies();

    if (!demoUser) {
      redirect("/auth");
    }

    teamMembers = workspaceUsers.map((member) => ({
      id: member.id,
      initials: member.initials,
      name: member.name,
      role: member.role,
    }));
  } else {
    const user = await getMarketingSessionUser();

    if (!user) {
      redirect("/auth");
    }

    const workspaceMembers = await listWorkspaceMembers(user.teamId);
    teamMembers = workspaceMembers.map((member) => ({
      id: member.id,
      initials: member.username
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase() || "WU",
      name: member.username,
      role: member.role,
    }));
  }

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
