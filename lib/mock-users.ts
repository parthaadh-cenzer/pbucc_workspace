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

export function getWorkspaceUserName(userId: string) {
  return workspaceUsersById.get(userId)?.name ?? userId;
}
