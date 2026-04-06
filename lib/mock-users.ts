export type WorkspaceUser = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

export const workspaceUsers: WorkspaceUser[] = [
  {
    id: "partha",
    name: "Partha",
    role: "Workspace Admin",
    initials: "PA",
  },
  {
    id: "test-admin",
    name: "Test Admin",
    role: "Workspace Reviewer",
    initials: "TA",
  },
];

export const workspaceUsersById = new Map(
  workspaceUsers.map((user) => [user.id, user]),
);

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

export function findWorkspaceUserByUsername(input: string) {
  const candidates = buildLookupCandidates(input);

  if (candidates.length < 1) {
    return null;
  }

  return (
    workspaceUsers.find((user) => {
      const userCandidates = buildLookupCandidates(`${user.id} ${user.name}`);
      return candidates.some((candidate) => userCandidates.includes(candidate));
    }) ?? null
  );
}

export function getWorkspaceUserName(userId: string) {
  return workspaceUsersById.get(userId)?.name ?? userId;
}
