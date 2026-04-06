import { NextResponse } from "next/server";
import { deleteShortLink, updateShortLink } from "@/lib/short-link-service";
import { getMarketingSessionUser, unauthorized } from "@/lib/security";
import type { UpdateShortLinkInput } from "@/lib/short-link-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const shortLinkId = id?.trim();

  if (!shortLinkId) {
    return NextResponse.json({ error: "Invalid short link id." }, { status: 400 });
  }

  let body: UpdateShortLinkInput;

  try {
    body = (await request.json()) as UpdateShortLinkInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const item = await updateShortLink({ id: shortLinkId, data: body });

    if (!item) {
      return NextResponse.json({ error: "Short link not found." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[Cenzer ShortLink][API][PATCH] Failed", {
      requestId,
      shortLinkId,
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      {
        error: "Unable to update short link.",
        requestId,
      },
      { status: 400 },
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const user = await getMarketingSessionUser();

  if (!user) {
    return unauthorized();
  }

  const { id } = await context.params;
  const shortLinkId = id?.trim();

  if (!shortLinkId) {
    return NextResponse.json({ error: "Invalid short link id." }, { status: 400 });
  }

  try {
    const deleted = await deleteShortLink(shortLinkId);

    if (!deleted) {
      return NextResponse.json({ error: "Short link not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Cenzer ShortLink][API][DELETE] Failed", {
      requestId,
      shortLinkId,
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      {
        error: "Unable to delete short link.",
        requestId,
      },
      { status: 500 },
    );
  }
}
