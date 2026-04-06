import { NextResponse } from "next/server";
import { getMarketingSessionUser, toSafeInt, unauthorized } from "@/lib/security";
import { getWorkspaceMemberById } from "@/lib/workspace-members";
import { listWorkspaceTasksForMember } from "@/lib/workspace-tasks";

type RouteContext = {
  params: Promise<{ memberId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const params = await context.params;
  const memberId = toSafeInt(params.memberId);

  if (!memberId) {
    return NextResponse.json({ error: "Invalid member id." }, { status: 400 });
  }

  const member = await getWorkspaceMemberById({
    memberId,
    teamId: user.teamId,
  });

  if (!member) {
    return NextResponse.json({ error: "Member not found." }, { status: 404 });
  }

  const tasks = await listWorkspaceTasksForMember({
    teamId: user.teamId,
    memberId,
  });

  return NextResponse.json({
    member: {
      id: member.id,
      name: member.username,
      role: member.role,
      teamName: member.teamName,
    },
    tasks,
  });
}
