import { notFound } from "next/navigation";
import { getDemoWorkspaceSelectionFromCookies } from "@/lib/demo-mode";
import {
  findWorkspaceUserForTeam,
  listWorkspaceUsersForTeam,
  workspaceTeams,
} from "@/lib/mock-users";
import { MemberProfileWorkspace } from "@/components/team/member-profile-workspace";

type PageProps = {
  params: Promise<{ memberId: string }>;
};

export default async function TeamMemberProfilePage({ params }: PageProps) {
  const selection = await getDemoWorkspaceSelectionFromCookies();
  const fallbackTeam = workspaceTeams[0] ?? null;
  const fallbackUser = fallbackTeam ? listWorkspaceUsersForTeam(fallbackTeam.id)[0] ?? null : null;
  const activeTeam = selection?.team ?? fallbackTeam;
  const activeUser = selection?.user ?? fallbackUser;

  if (!activeTeam || !activeUser) {
    notFound();
  }

  const routeParams = await params;
  const selectedMember = findWorkspaceUserForTeam({
    teamId: activeTeam.id,
    userId: routeParams.memberId,
  });

  if (!selectedMember) {
    notFound();
  }

  return (
    <MemberProfileWorkspace
      demoMode
      currentUserName={activeUser.name}
      initialProfile={{
        member: {
          id: selectedMember.id,
          name: selectedMember.name,
          role: selectedMember.role,
          teamName: activeTeam.name,
        },
        tasks: [],
      }}
    />
  );
}
