import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMarketingSessionUser, normalizeUserText, unauthorized } from "@/lib/security";

type RouteContext = {
  params: Promise<{ threadId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const params = await context.params;
  const threadId = Number(params.threadId);

  if (!Number.isInteger(threadId)) {
    return NextResponse.json({ error: "Invalid thread id." }, { status: 400 });
  }

  const thread = await prisma.chatThread.findFirst({
    where: {
      id: threadId,
      userId: user.id,
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { threadId },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ messages });
}

export async function POST(request: Request, context: RouteContext) {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const params = await context.params;
  const threadId = Number(params.threadId);

  if (!Number.isInteger(threadId)) {
    return NextResponse.json({ error: "Invalid thread id." }, { status: 400 });
  }

  const thread = await prisma.chatThread.findFirst({
    where: {
      id: threadId,
      userId: user.id,
    },
  });

  if (!thread) {
    return NextResponse.json({ error: "Thread not found." }, { status: 404 });
  }

  let body: { role?: string; content?: string };

  try {
    body = (await request.json()) as { role?: string; content?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const roleRaw = typeof body.role === "string" ? normalizeUserText(body.role, 24).toLowerCase() : "user";
  const role = roleRaw === "assistant" ? "assistant" : "user";
  const content = typeof body.content === "string" ? normalizeUserText(body.content, 8000) : "";

  if (!content) {
    return NextResponse.json({ error: "Message content is required." }, { status: 400 });
  }

  const message = await prisma.chatMessage.create({
    data: {
      threadId,
      role,
      content,
    },
  });

  return NextResponse.json({ message }, { status: 201 });
}
