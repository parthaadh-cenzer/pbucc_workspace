import { workspaceUsers } from "@/lib/mock-users";

export type WorkspaceReviewMember = {
  id: string;
  name: string;
  role: string;
  initials: string;
};

export const workspaceReviewMembers: WorkspaceReviewMember[] = workspaceUsers.map((member) => ({
  id: member.id,
  name: member.name,
  role: member.role,
  initials: member.initials,
}));
