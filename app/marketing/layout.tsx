import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { authOptions } from "@/lib/auth";
import { marketingSidebarItems } from "@/lib/mock-data";
import { MARKETING_TEAM_NAME } from "@/lib/security";

export default async function MarketingLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth");
  }

  if (
    !session.user.teamId ||
    !session.user.teamName ||
    session.user.teamName.toLowerCase() !== MARKETING_TEAM_NAME.toLowerCase()
  ) {
    redirect("/auth");
  }

  const teamName = session.user.teamName ?? "Marketing";
  const userName = session.user.username || "Workspace User";

  return (
    <div className="min-h-screen">
      <div className="grid min-h-screen lg:grid-cols-[270px_1fr]">
        <Sidebar items={marketingSidebarItems} />

        <div className="flex min-h-screen flex-col">
          <TopHeader teamName={teamName} userName={userName} />
          <main className="flex-1 p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
