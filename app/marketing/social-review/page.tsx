import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { SocialReviewWorkspace } from "@/components/social-review/social-review-workspace";
import { authOptions } from "@/lib/auth";
import { getDemoWorkspaceUserFromCookies, isDemoModeEnabled } from "@/lib/demo-mode";

export default async function SocialReviewPage() {
  let currentUserName = "Workspace User";

  if (isDemoModeEnabled()) {
    const demoUser = await getDemoWorkspaceUserFromCookies();

    if (!demoUser) {
      redirect("/auth");
    }

    currentUserName = demoUser.name;
  } else {
    const session = await getServerSession(authOptions);
    currentUserName = session?.user?.username || "Workspace User";
  }

  return <SocialReviewWorkspace currentUserName={currentUserName} />;
}
