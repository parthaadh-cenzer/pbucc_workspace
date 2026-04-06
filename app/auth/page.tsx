import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthForm } from "@/components/auth/auth-form";
import { DemoEntryForm } from "@/components/auth/demo-entry-form";
import { authOptions } from "@/lib/auth";
import { getDemoWorkspaceUserFromCookies, isDemoModeEnabled } from "@/lib/demo-mode";

export default async function AuthPage() {
  if (isDemoModeEnabled()) {
    const demoUser = await getDemoWorkspaceUserFromCookies();

    if (demoUser) {
      redirect("/marketing/dashboard");
    }

    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-10">
        <DemoEntryForm />
      </main>
    );
  }

  const session = await getServerSession(authOptions);

  if (session?.user) {
    redirect("/marketing/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <AuthForm />
    </main>
  );
}
