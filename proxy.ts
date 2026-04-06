import { type NextFetchEvent, type NextRequest, NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

const authMiddleware = withAuth({
  pages: {
    signIn: "/auth",
  },
});

const runAuthMiddleware = authMiddleware as unknown as (
  request: NextRequest,
  event: NextFetchEvent,
) => ReturnType<typeof NextResponse.next>;

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  if (process.env.DEMO_MODE === "true") {
    return NextResponse.next();
  }

  return runAuthMiddleware(request, event);
}

export const config = {
  matcher: ["/marketing/:path*", "/api/memory/:path*", "/api/chat/:path*"],
};
