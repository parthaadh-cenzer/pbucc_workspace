import { cookies } from "next/headers";
import { DEMO_MODE_COOKIE_NAME } from "@/lib/demo-mode-constants";
import { findWorkspaceUserById, type WorkspaceUser } from "@/lib/mock-users";

export function isDemoModeEnabled() {
  return process.env.DEMO_MODE === "true";
}

export async function getDemoUserIdFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_MODE_COOKIE_NAME)?.value ?? null;
}

export async function getDemoWorkspaceUserFromCookies(): Promise<WorkspaceUser | null> {
  const userId = await getDemoUserIdFromCookies();

  if (!userId) {
    return null;
  }

  return findWorkspaceUserById(userId);
}
