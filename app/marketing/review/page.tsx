import { ReviewWorkspace } from "@/components/review/review-workspace";
import { getDemoWorkspaceSelectionFromCookies } from "@/lib/demo-mode";
import { listWorkspaceUsersForTeam, workspaceTeams } from "@/lib/mock-users";

export default async function ReviewPage() {
  const selection = await getDemoWorkspaceSelectionFromCookies();
  const fallbackTeamId = workspaceTeams[0]?.id ?? "marketing";
  const fallbackUserName = listWorkspaceUsersForTeam(fallbackTeamId)[0]?.name ?? "Workspace User";
  const currentUserName = selection?.user.name ?? fallbackUserName;

  return <ReviewWorkspace currentUserName={currentUserName} />;
}
