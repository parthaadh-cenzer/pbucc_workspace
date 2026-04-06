import { NextResponse } from "next/server";
import { createShortLink, listShortLinks } from "@/lib/short-link-service";
import { getMarketingSessionUser, unauthorized } from "@/lib/security";
import type { CreateShortLinkInput } from "@/lib/short-link-types";

export const runtime = "nodejs";

export async function GET() {
  const requestId = crypto.randomUUID().slice(0, 8);
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  try {
    const items = await listShortLinks();
    return NextResponse.json({ items });
  } catch (error) {
    console.error("[Cenzer ShortLink][API][GET] Failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        error: "Unable to load short links.",
        requestId,
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  let body: CreateShortLinkInput;

  try {
    body = (await request.json()) as CreateShortLinkInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body.destinationUrl || !body.domain) {
    return NextResponse.json(
      { error: "destinationUrl and domain are required." },
      { status: 400 },
    );
  }

  if (typeof body.destinationUrl === "string" && body.destinationUrl.length > 2000) {
    return NextResponse.json({ error: "Destination URL is too long." }, { status: 400 });
  }

  try {
    const item = await createShortLink({ data: body });
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[Cenzer ShortLink][API][POST] Failed", {
      requestId,
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      {
        error: "Unable to create short link.",
        requestId,
      },
      { status: 400 },
    );
  }
}
