import { hash } from "bcrypt";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  MARKETING_TEAM_NAME,
  getRequestIdentifier,
  normalizeUserText,
  tooManyRequests,
} from "@/lib/security";

type RegisterPayload = {
  username?: string;
  password?: string;
  confirmPassword?: string;
};

export async function POST(request: Request) {
  const identifier = getRequestIdentifier(request);
  const limiter = checkRateLimit({
    key: `register:${identifier}`,
    limit: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!limiter.allowed) {
    return tooManyRequests(limiter.retryAfterSeconds);
  }

  let body: RegisterPayload;

  try {
    body = (await request.json()) as RegisterPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  const username = normalizeUserText((body.username ?? "").toLowerCase(), 64);
  const password = body.password ?? "";
  const confirmPassword = body.confirmPassword ?? "";

  if (!username || !password || !confirmPassword) {
    return NextResponse.json(
      { error: "Username, password, and confirm password are required." },
      { status: 400 },
    );
  }

  if (!/^[a-z0-9._-]{3,64}$/.test(username)) {
    return NextResponse.json(
      { error: "Username must be 3-64 chars and use letters, numbers, dot, dash, or underscore." },
      { status: 400 },
    );
  }

  if (password.length < 8 || password.length > 128) {
    return NextResponse.json(
      { error: "Password must be between 8 and 128 characters." },
      { status: 400 },
    );
  }

  if (password !== confirmPassword) {
    return NextResponse.json(
      { error: "Passwords do not match." },
      { status: 400 },
    );
  }

  const existingUser = await prisma.user.findUnique({
    where: { username },
  });

  if (existingUser) {
    return NextResponse.json(
      { error: "Username already exists." },
      { status: 409 },
    );
  }

  const marketingTeam = await prisma.team.upsert({
    where: { name: MARKETING_TEAM_NAME },
    update: {},
    create: { name: MARKETING_TEAM_NAME },
    select: { id: true },
  });

  const passwordHash = await hash(password, 12);

  await prisma.user.create({
    data: {
      username,
      passwordHash,
      teamId: marketingTeam.id,
    },
  });

  return NextResponse.json({ success: true }, { status: 201 });
}
