export type WorkspaceTeam = {
  id: string;
  name: string;
  description: string;
};

export type WorkspaceUser = {
  id: string;
  teamId: string;
  name: string;
  role: string;
  initials: string;
};

export const workspaceTeams: WorkspaceTeam[] = [
  {
    id: "marketing",
    name: "Marketing",
    description: "Campaign, review, and content operations",
  },
];

export const workspaceUsers: WorkspaceUser[] = [
  {
    id: "partha",
    teamId: "marketing",
    name: "Partha",
    role: "Workspace Lead",
    initials: "PA",
  },
  {
    id: "steve",
    teamId: "marketing",
    name: "Steve",
    role: "Campaign Manager",
    initials: "ST",
  },
  {
    id: "emma",
    teamId: "marketing",
    name: "Emma",
    role: "Social Reviewer",
    initials: "EM",
  },
  {
    id: "judith",
    teamId: "marketing",
    name: "Judith",
    role: "SEO Specialist",
    initials: "JU",
  },
  {
    id: "caroline",
    teamId: "marketing",
    name: "Caroline",
    role: "Content Coordinator",
    initials: "CA",
  },
];

export const workspaceUsersById = new Map(workspaceUsers.map((user) => [user.id, user]));
export const workspaceTeamsById = new Map(workspaceTeams.map((team) => [team.id, team]));

function normalizeWorkspaceUserValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function buildLookupCandidates(value: string) {
  const normalized = normalizeWorkspaceUserValue(value);

  if (!normalized) {
    return [];
  }

  const compact = normalized.replace(/[\s._-]+/g, "");
  const spaced = normalized.replace(/[._-]+/g, " ");

  return Array.from(new Set([normalized, compact, spaced]));
}

export function findWorkspaceUserById(userId: string) {
  return workspaceUsersById.get(userId) ?? null;
}

export function findWorkspaceTeamById(teamId: string) {
  return workspaceTeamsById.get(teamId) ?? null;
}

export function listWorkspaceUsersForTeam(teamId: string) {
  return workspaceUsers.filter((user) => user.teamId === teamId);
}

export function findWorkspaceUserForTeam(input: { teamId: string; userId: string }) {
  const user = findWorkspaceUserById(input.userId);

  if (!user || user.teamId !== input.teamId) {
    return null;
  }

  return user;
}

export function findWorkspaceUserByUsername(input: string, teamId?: string) {
  const candidates = buildLookupCandidates(input);

  if (candidates.length < 1) {
    return null;
  }

  const users = teamId ? listWorkspaceUsersForTeam(teamId) : workspaceUsers;

  return (
    users.find((user) => {
      const userCandidates = buildLookupCandidates(`${user.id} ${user.name}`);
      return candidates.some((candidate) => userCandidates.includes(candidate));
    }) ?? null
  );
}

export function getWorkspaceUserName(userId: string) {
  return workspaceUsersById.get(userId)?.name ?? userId;
}
