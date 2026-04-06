import { notFound, redirect } from "next/navigation";
import { getMarketingSessionUser, toSafeInt } from "@/lib/security";
import { getWorkspaceMemberById } from "@/lib/workspace-members";
import { listWorkspaceTasksForMember } from "@/lib/workspace-tasks";
import { MemberProfileWorkspace } from "@/components/team/member-profile-workspace";

type PageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function TeamMemberProfilePage({ params }: PageProps) {
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
