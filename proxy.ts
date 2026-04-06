import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  DEMO_MODE_COOKIE_NAME,
  DEMO_MODE_TEAM_COOKIE_NAME,
} from "@/lib/demo-mode-constants";

const PUBLIC_PATHS = new Set(["/", "/auth", "/qr", "/favicon.ico"]);
const PUBLIC_PREFIXES = ["/_next", "/api", "/assets", "/public", "/r", "/s"];
const PROTECTED_PREFIXES = ["/marketing", "/dashboard", "/app"];

function isPrefixedPath(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

function isPublicPath(pathname: string) {
  if (PUBLIC_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_PREFIXES.some((prefix) => isPrefixedPath(pathname, prefix));
}

function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some((prefix) => isPrefixedPath(pathname, prefix));
}

function hasAuthSession(request: NextRequest) {
  const hasNextAuthSession = Boolean(
    request.cookies.get("next-auth.session-token")?.value ||
      request.cookies.get("__Secure-next-auth.session-token")?.value ||
      request.cookies.get("authjs.session-token")?.value ||
      request.cookies.get("__Secure-authjs.session-token")?.value,
  );

  if (hasNextAuthSession) {
    return true;
  }

  const hasDemoSelection = Boolean(
    request.cookies.get(DEMO_MODE_COOKIE_NAME)?.value &&
      request.cookies.get(DEMO_MODE_TEAM_COOKIE_NAME)?.value,
  );

  return hasDemoSelection;
}

export default function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (hasAuthSession(request)) {
    return NextResponse.next();
  }

  const signInUrl = request.nextUrl.clone();
  signInUrl.pathname = "/auth";
  signInUrl.searchParams.set(
    "redirectTo",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml)$).*)",
  ],
};
