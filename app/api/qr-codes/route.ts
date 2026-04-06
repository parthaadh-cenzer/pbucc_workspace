import { NextResponse } from "next/server";
import { resolveRequestOrigin } from "@/lib/cenzer-runtime";
import { createQrRedirect, listQrRedirects } from "@/lib/qr-code-service";
import { getMarketingSessionUser, unauthorized } from "@/lib/security";
import type { CreateQrRedirectInput } from "@/lib/qr-code-types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const user = await getMarketingSessionUser();

  if (!user) {
    console.warn("[Cenzer QR][API][GET] Unauthorized", { requestId });
    return unauthorized();
  }

  try {
    const origin = resolveRequestOrigin(request);
    const items = await listQrRedirects({ origin });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("[Cenzer QR][API][GET] Failed", {
      requestId,
      userId: user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        error: "Unable to load redirect QR records.",
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
    console.warn("[Cenzer QR][API][POST] Unauthorized", { requestId });
    return unauthorized();
  }

  let body: CreateQrRedirectInput;

  try {
    body = (await request.json()) as CreateQrRedirectInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body?.destinationUrl || !body?.color) {
    return NextResponse.json(
      { error: "destinationUrl and color are required." },
      { status: 400 },
    );
  }

  if (typeof body.destinationUrl === "string" && body.destinationUrl.length > 2000) {
    return NextResponse.json({ error: "Destination URL is too long." }, { status: 400 });
  }

  try {
    const origin = resolveRequestOrigin(request);
    const item = await createQrRedirect({ origin, data: body });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("[Cenzer QR][API][POST] Failed", {
      requestId,
      userId: user.id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        error: "Unable to create redirect QR.",
        requestId,
      },
      { status: 500 },
    );
  }
}
