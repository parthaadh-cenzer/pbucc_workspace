import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { AuthForm } from "@/components/auth/auth-form";
import { authOptions } from "@/lib/auth";

export default async function AuthPage() {
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
