import { NextResponse } from "next/server";
import { resolveRequestOrigin } from "@/lib/cenzer-runtime";
import { renderQrDownload } from "@/lib/qr-code-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const requestId = crypto.randomUUID().slice(0, 8);

  const { id } = await context.params;
  const redirectId = id?.trim();

  if (!redirectId) {
    return NextResponse.json({ error: "Invalid redirect id." }, { status: 400 });
  }

  const url = new URL(request.url);
  const color = url.searchParams.get("color") ?? "";

  try {
    const origin = resolveRequestOrigin(request);
    const file = await renderQrDownload({ id: redirectId, origin, color });

    if (!file) {
      return NextResponse.json({ error: "Redirect record not found." }, { status: 404 });
    }

    const body = new Uint8Array(file.imageBuffer);

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename=\"${file.fileName}\"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[Cenzer QR][API][DOWNLOAD] Failed", {
      requestId,
      redirectId,
      color,
      error: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      {
        error: "Unable to generate QR download for this redirect.",
        requestId,
      },
      { status: 500 },
    );
  }
}
