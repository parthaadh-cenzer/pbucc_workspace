import { compare } from "bcrypt";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { MARKETING_TEAM_NAME, normalizeUserText } from "@/lib/security";

function buildUsernameCandidates(rawInput: string) {
  const base = normalizeUserText(rawInput.toLowerCase(), 64);

  if (!base) {
    return [];
  }

  const compact = base.replace(/\s+/g, "");
  const dotted = base.replace(/\s+/g, ".");
  const dashed = base.replace(/\s+/g, "-");
  const underscored = base.replace(/\s+/g, "_");

  return Array.from(new Set([base, compact, dotted, dashed, underscored]));
}

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
  },
  providers: [
    CredentialsProvider({
      name: "Username and Password",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const usernameInput = typeof credentials?.username === "string"
          ? credentials.username
          : "";
        const usernameCandidates = buildUsernameCandidates(usernameInput);
        const password = credentials?.password;

        if (usernameCandidates.length === 0 || !password) {
          return null;
        }

        const hasValidCandidate = usernameCandidates.some((candidate) => /^[a-z0-9._\-\s]{3,64}$/.test(candidate));

        if (!hasValidCandidate) {
          return null;
        }

        if (password.length < 8 || password.length > 128) {
          return null;
        }

        const user = await prisma.user.findFirst({
          where: {
            OR: usernameCandidates.map((username) => ({ username })),
          },
          include: { team: true },
        });

        if (!user) {
          return null;
        }

        const isValid = await compare(password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        if (!user.teamId || !user.team || user.team.name.toLowerCase() !== MARKETING_TEAM_NAME.toLowerCase()) {
          return null;
        }

        return {
          id: user.id.toString(),
          name: user.username,
          teamId: user.teamId,
          teamName: user.team?.name ?? null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = Number(user.id);
        token.username = user.name ?? "";
        token.teamId = (user as { teamId?: number | null }).teamId ?? null;
        token.teamName = (user as { teamName?: string | null }).teamName ?? null;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = Number(token.userId ?? token.sub ?? 0);
        session.user.username = typeof token.username === "string" ? token.username : "";
        session.user.teamId =
          typeof token.teamId === "number" ? token.teamId : null;
        session.user.teamName =
          typeof token.teamName === "string" ? token.teamName : null;
        session.user.name = session.user.username;
      }

      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
