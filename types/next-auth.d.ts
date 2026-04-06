import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: number;
      username: string;
      teamId: number | null;
      teamName: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    teamId?: number | null;
    teamName?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: number;
    username?: string;
    teamId?: number | null;
    teamName?: string | null;
  }
}
