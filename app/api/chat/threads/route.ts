import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMarketingSessionUser, normalizeUserText, unauthorized } from "@/lib/security";

export async function GET() {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const threads = await prisma.chatThread.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      title: true,
      createdAt: true,
      _count: {
        select: { messages: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ threads });
}

export async function POST(request: Request) {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  let body: { title?: string };

  try {
    body = (await request.json()) as { title?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const title = typeof body.title === "string" ? normalizeUserText(body.title, 140) : "";

  if (!title) {
    return NextResponse.json({ error: "Thread title is required." }, { status: 400 });
  }

  const thread = await prisma.chatThread.create({
    data: {
      userId: user.id,
      title,
    },
  });

  return NextResponse.json({ thread }, { status: 201 });
}
