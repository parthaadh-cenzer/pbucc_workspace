import { notFound, redirect } from "next/navigation";
import { getDemoWorkspaceUserFromCookies, isDemoModeEnabled } from "@/lib/demo-mode";
import { findWorkspaceUserById } from "@/lib/mock-users";
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
    const demoUser = await getDemoWorkspaceUserFromCookies();

    if (!demoUser) {
      redirect("/auth");
    }

    const routeParams = await params;
    const selectedMember = findWorkspaceUserById(routeParams.memberId);

    if (!selectedMember) {
      notFound();
    }

    return (
      <MemberProfileWorkspace
        demoMode
        currentUserName={demoUser.name}
        initialProfile={{
          member: {
            id: selectedMember.id,
            name: selectedMember.name,
            role: selectedMember.role,
            teamName: "Marketing",
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
