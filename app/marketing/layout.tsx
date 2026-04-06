import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { getDemoWorkspaceSelectionFromCookies, isDemoModeEnabled } from "@/lib/demo-mode";
import { listWorkspaceUsersForTeam, workspaceTeams } from "@/lib/mock-users";
import { marketingSidebarItems } from "@/lib/mock-data";

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const selection = await getDemoWorkspaceSelectionFromCookies();
  const fallbackTeam = workspaceTeams[0] ?? null;
  const fallbackUser = fallbackTeam ? listWorkspaceUsersForTeam(fallbackTeam.id)[0] ?? null : null;
  const teamName = selection?.team.name ?? fallbackTeam?.name ?? "Workspace";
  const userName = selection?.user.name ?? fallbackUser?.name ?? "Workspace User";
  const demoMode = isDemoModeEnabled();

  return (
    <div className="min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[270px_1fr]">
        <Sidebar items={marketingSidebarItems} />

        <div className="flex min-h-screen flex-col">
          <TopHeader teamName={teamName} userName={userName} demoMode={demoMode} />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
