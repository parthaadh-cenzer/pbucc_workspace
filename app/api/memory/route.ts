import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMarketingSessionUser, normalizeUserText, unauthorized } from "@/lib/security";

export async function GET(request: Request) {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const url = new URL(request.url);
  const key = url.searchParams.get("key");

  if (key) {
    const memoryEntry = await prisma.userMemory.findUnique({
      where: {
        userId_key: {
          userId: user.id,
          key,
        },
      },
    });

    return NextResponse.json({ memory: memoryEntry ?? null });
  }

  const memoryEntries = await prisma.userMemory.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ memory: memoryEntries });
}

export async function PUT(request: Request) {
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  let body: { key?: string; value?: string };

  try {
    body = (await request.json()) as { key?: string; value?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const key = body.key ? normalizeUserText(body.key, 96) : "";
  const value = body.value;

  if (!key || typeof value !== "string" || value.length > 20_000) {
    return NextResponse.json(
      { error: "Both key and value are required." },
      { status: 400 },
    );
  }

  const memoryEntry = await prisma.userMemory.upsert({
    where: {
      userId_key: {
        userId: user.id,
        key,
      },
    },
    update: {
      value,
    },
    create: {
      userId: user.id,
      key,
      value,
    },
  });

  return NextResponse.json({ memory: memoryEntry }, { status: 200 });
}
