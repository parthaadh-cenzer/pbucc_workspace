import { SocialReviewWorkspace } from "@/components/social-review/social-review-workspace";
import { getDemoWorkspaceSelectionFromCookies } from "@/lib/demo-mode";
import { listWorkspaceUsersForTeam, workspaceTeams } from "@/lib/mock-users";

export default async function SocialReviewPage() {
  const selection = await getDemoWorkspaceSelectionFromCookies();
  const fallbackTeamId = workspaceTeams[0]?.id ?? "marketing";
  const fallbackUserName = listWorkspaceUsersForTeam(fallbackTeamId)[0]?.name ?? "Workspace User";
  const currentUserName = selection?.user.name ?? fallbackUserName;

  return <SocialReviewWorkspace currentUserName={currentUserName} />;
}
