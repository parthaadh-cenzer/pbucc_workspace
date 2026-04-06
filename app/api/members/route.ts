import { NextResponse } from "next/server";
import { getMarketingSessionUser, unauthorized } from "@/lib/security";
import { listWorkspaceMembers } from "@/lib/workspace-members";

export async function GET() {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const members = await listWorkspaceMembers(user.teamId);

  return NextResponse.json({
    members: members.map((member) => ({
      id: member.id,
      username: member.username,
      role: member.role,
      teamName: member.teamName,
    })),
  });
}
