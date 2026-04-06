import { getServerSession } from "next-auth";
import { ReviewWorkspace } from "@/components/review/review-workspace";
import { authOptions } from "@/lib/auth";

export default async function ReviewPage() {
  const session = await getServerSession(authOptions);
  const currentUserName = session?.user?.username || "Workspace User";

  return <ReviewWorkspace currentUserName={currentUserName} />;
}
