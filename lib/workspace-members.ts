import { prisma } from "@/lib/prisma";

export type WorkspaceMemberProfile = {
  id: number;
  username: string;
  role: string;
  teamId: number;
  teamName: string;
};

export async function listWorkspaceMembers(teamId: number) {
  const members = await prisma.user.findMany({
    where: { teamId },
    select: {
      id: true,
      username: true,
      teamId: true,
      team: {
        select: {
          name: true,
        },
      },
    },
    orderBy: { username: "asc" },
  });

  return members.map((member) => ({
    id: member.id,
    username: member.username,
    role: "Marketing Member",
    teamId: member.teamId ?? teamId,
    teamName: member.team?.name ?? "Marketing",
  }));
}

export async function getWorkspaceMemberById(input: {
  memberId: number;
  teamId: number;
}) {
  const member = await prisma.user.findFirst({
    where: {
      id: input.memberId,
      teamId: input.teamId,
    },
    select: {
      id: true,
      username: true,
      teamId: true,
      team: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!member) {
    return null;
  }

  return {
    id: member.id,
    username: member.username,
    role: "Marketing Member",
    teamId: member.teamId ?? input.teamId,
    teamName: member.team?.name ?? "Marketing",
  } satisfies WorkspaceMemberProfile;
}
