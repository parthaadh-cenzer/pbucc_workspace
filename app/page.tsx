import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDemoWorkspaceUserFromCookies, isDemoModeEnabled } from "@/lib/demo-mode";

export default async function Home() {
  if (isDemoModeEnabled()) {
    const demoUser = await getDemoWorkspaceUserFromCookies();
    redirect(demoUser ? "/marketing/dashboard" : "/auth");
  }

  const session = await getServerSession(authOptions);

  redirect(session?.user ? "/marketing/dashboard" : "/auth");
}
