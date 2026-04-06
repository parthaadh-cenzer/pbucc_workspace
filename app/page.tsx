import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDemoWorkspaceSelectionFromCookies, isDemoModeEnabled } from "@/lib/demo-mode";

export default async function Home() {
  if (isDemoModeEnabled()) {
    const selection = await getDemoWorkspaceSelectionFromCookies();
    redirect(selection ? "/marketing/dashboard" : "/auth");
  }

  const session = await getServerSession(authOptions);

  redirect(session?.user ? "/marketing/dashboard" : "/auth");
}
