import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MARKETING_TEAM_NAME, getMarketingSessionUser, unauthorized } from "@/lib/security";

export async function GET() {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const teams = await prisma.team.findMany({
    where: {
      name: MARKETING_TEAM_NAME,
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ teams });
}
