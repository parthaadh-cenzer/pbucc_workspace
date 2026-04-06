import { NextResponse } from "next/server";
import { incrementShortLinkClickAndResolve } from "@/lib/short-link-service";
import { resolveDomainFromRequest } from "@/lib/short-link-runtime";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { slug } = await context.params;

  if (!slug) {
    return NextResponse.json({ error: "Slug is required." }, { status: 400 });
  }

  const url = new URL(request.url);
  const queryDomain = url.searchParams.get("domain");
  const domain = resolveDomainFromRequest({ request, queryDomain });

  const destination = await incrementShortLinkClickAndResolve({ domain, slug });

  if (!destination) {
    return NextResponse.json({ error: "Short link not found." }, { status: 404 });
  }

  return NextResponse.redirect(destination, 307);
}
