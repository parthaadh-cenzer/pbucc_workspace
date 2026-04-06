import { notFound, redirect } from "next/navigation";
import { getDemoWorkspaceSelectionFromCookies, isDemoModeEnabled } from "@/lib/demo-mode";
import { findWorkspaceUserForTeam } from "@/lib/mock-users";
import { getMarketingSessionUser, toSafeInt } from "@/lib/security";
import { getWorkspaceMemberById } from "@/lib/workspace-members";
import { listWorkspaceTasksForMember } from "@/lib/workspace-tasks";
import { MemberProfileWorkspace } from "@/components/team/member-profile-workspace";

type PageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function TeamMemberProfilePage({ params }: PageProps) {
  const demoMode = isDemoModeEnabled();

  if (demoMode) {
    const selection = await getDemoWorkspaceSelectionFromCookies();

    if (!selection) {
      redirect("/auth");
    }

    const routeParams = await params;
    const selectedMember = findWorkspaceUserForTeam({
      teamId: selection.team.id,
      userId: routeParams.memberId,
    });

    if (!selectedMember) {
      notFound();
    }

    return (
      <MemberProfileWorkspace
        demoMode
        currentUserName={selection.user.name}
        initialProfile={{
          member: {
            id: selectedMember.id,
            name: selectedMember.name,
            role: selectedMember.role,
            teamName: selection.team.name,
          },
          tasks: [],
        }}
      />
    );
  }

  const user = await getMarketingSessionUser();

  if (!user) {
    redirect("/auth");
  }

  const routeParams = await params;
  const memberId = toSafeInt(routeParams.memberId);

  if (!memberId) {
    notFound();
  }

  const [member, tasks] = await Promise.all([
    getWorkspaceMemberById({
      memberId,
      teamId: user.teamId,
    }),
    listWorkspaceTasksForMember({
      teamId: user.teamId,
      memberId,
    }),
  ]);

  if (!member) {
    notFound();
  }

  return (
    <MemberProfileWorkspace
      currentUserName={user.username}
      demoMode={false}
      initialProfile={{
        member: {
          id: member.id,
          name: member.username,
          role: member.role,
          teamName: member.teamName,
        },
        tasks,
      }}
    />
  );
}
