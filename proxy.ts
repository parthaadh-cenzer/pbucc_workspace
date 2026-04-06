import { NextResponse } from "next/server";

export default function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ["/marketing/:path*", "/api/memory/:path*", "/api/chat/:path*"],
};
