import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export const MARKETING_TEAM_NAME = "Marketing";

export type MarketingSessionUser = {
  id: number;
  username: string;
  teamId: number;
  teamName: string;
};

export function normalizeUserText(value: string, maxLength: number) {
  return value
    .trim()
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .replace(/[<>]/g, "")
    .slice(0, maxLength);
}

export function toSafeInt(value: string | number) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

export function getRequestIdentifier(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  return forwardedFor || realIp || cfIp || "unknown-client";
}

export function badRequest(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: "Too many attempts. Please try again later.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}

export function sanitizeOptionalText(input: unknown, maxLength: number) {
  if (typeof input !== "string") {
    return null;
  }

  const normalized = normalizeUserText(input, maxLength);
  return normalized.length > 0 ? normalized : null;
}

export function requireStringField(input: unknown, maxLength: number) {
  if (typeof input !== "string") {
    return null;
  }

  const normalized = normalizeUserText(input, maxLength);
  return normalized.length > 0 ? normalized : null;
}

export function parseDueDate(input: unknown) {
  if (typeof input !== "string") {
    return null;
  }

  const normalized = input.trim();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return null;
  }

  const date = new Date(`${normalized}T00:00:00Z`);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return { isoDate: normalized, date };
}

export async function getMarketingSessionUser(): Promise<MarketingSessionUser | null> {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id || !session.user.username) {
    return null;
  }

  const teamId = typeof session.user.teamId === "number" ? session.user.teamId : null;
  const teamName = typeof session.user.teamName === "string" ? session.user.teamName : "";

  if (!teamId || teamName.toLowerCase() !== MARKETING_TEAM_NAME.toLowerCase()) {
    return null;
  }

  return {
    id: session.user.id,
    username: session.user.username,
    teamId,
    teamName,
  };
}
