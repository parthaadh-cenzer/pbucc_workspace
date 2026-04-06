import { cookies } from "next/headers";
import {
  DEMO_MODE_COOKIE_NAME,
  DEMO_MODE_TEAM_COOKIE_NAME,
} from "@/lib/demo-mode-constants";
import {
  findWorkspaceTeamById,
  findWorkspaceUserForTeam,
  type WorkspaceTeam,
  type WorkspaceUser,
} from "@/lib/mock-users";

export function isDemoModeEnabled() {
  return process.env.DEMO_MODE === "true";
}

export async function getDemoUserIdFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_MODE_COOKIE_NAME)?.value ?? null;
}

export async function getDemoTeamIdFromCookies() {
  const cookieStore = await cookies();
  return cookieStore.get(DEMO_MODE_TEAM_COOKIE_NAME)?.value ?? null;
}

export type DemoWorkspaceSelection = {
  team: WorkspaceTeam;
  user: WorkspaceUser;
};

export async function getDemoWorkspaceSelectionFromCookies(): Promise<DemoWorkspaceSelection | null> {
  const teamId = await getDemoTeamIdFromCookies();
  const userId = await getDemoUserIdFromCookies();

  if (!teamId || !userId) {
    return null;
  }

  const team = findWorkspaceTeamById(teamId);
  const user = findWorkspaceUserForTeam({ teamId, userId });

  if (!team || !user) {
    return null;
  }

  return { team, user };
}

export async function getDemoWorkspaceUserFromCookies(): Promise<WorkspaceUser | null> {
  const selection = await getDemoWorkspaceSelectionFromCookies();
  return selection?.user ?? null;
}
