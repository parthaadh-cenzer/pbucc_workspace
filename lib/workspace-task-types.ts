export const workspaceTaskStatuses = ["Ongoing", "Upcoming"] as const;

export type WorkspaceTaskStatusLabel = (typeof workspaceTaskStatuses)[number];

export type WorkspaceTaskRecord = {
  id: string;
  title: string;
  description: string | null;
  status: WorkspaceTaskStatusLabel;
  dueDate: string;
  freshdeskTicket: string | null;
  assigneeId: number;
  assigneeName: string;
  createdById: number;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
};

export type WorkspaceMemberProfilePayload = {
  member: {
    id: number;
    name: string;
    role: string;
    teamName: string;
  };
  tasks: WorkspaceTaskRecord[];
};
