import { NextResponse } from "next/server";
import { incrementScanAndResolveDestination } from "@/lib/qr-code-service";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json({ error: "Redirect slug is required." }, { status: 400 });
  }

  // This route keeps QR images stable: QR points to /r/[slug], while destination can change.
  const destination = await incrementScanAndResolveDestination(slug);

  if (!destination) {
    return NextResponse.json({ error: "Redirect not found." }, { status: 404 });
  }

  return NextResponse.redirect(destination, 307);
}
