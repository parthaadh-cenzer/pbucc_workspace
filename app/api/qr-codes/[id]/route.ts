import { NextResponse } from "next/server";
import { resolveRequestOrigin } from "@/lib/cenzer-runtime";
import { updateQrRedirect } from "@/lib/qr-code-service";
import { getMarketingSessionUser, unauthorized } from "@/lib/security";
import type { UpdateQrRedirectInput } from "@/lib/qr-code-types";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID().slice(0, 8);
  const user = await getMarketingSessionUser();

  if (!user) {
    console.warn("[Cenzer QR][API][PATCH] Unauthorized", { requestId });
    return unauthorized();
  }

  const { id } = await context.params;
  const redirectId = id?.trim();

  if (!redirectId) {
    return NextResponse.json({ error: "Invalid redirect id." }, { status: 400 });
  }

  let body: UpdateQrRedirectInput;

  try {
    body = (await request.json()) as UpdateQrRedirectInput;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  try {
    const origin = resolveRequestOrigin(request);
    const item = await updateQrRedirect({ id: redirectId, origin, data: body });

    if (!item) {
      console.warn("[Cenzer QR][API][PATCH] Redirect record not found", {
        requestId,
        userId: user.id,
        redirectId,
      });
      return NextResponse.json({ error: "Redirect record not found." }, { status: 404 });
    }

    return NextResponse.json({ item });
  } catch (error) {
    console.error("[Cenzer QR][API][PATCH] Failed", {
      requestId,
      userId: user.id,
      redirectId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      {
        error: "Unable to update redirect QR.",
        requestId,
      },
      { status: 500 },
    );
  }
}
