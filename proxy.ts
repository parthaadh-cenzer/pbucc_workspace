import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/auth",
  },
});

export const config = {
  matcher: ["/marketing/:path*", "/api/memory/:path*", "/api/chat/:path*"],
};
