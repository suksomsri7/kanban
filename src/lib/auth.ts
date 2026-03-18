import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import type { SessionUser } from "@/types";

// Auth.js v5 uses AUTH_URL; ensure it is set from NEXTAUTH_URL for custom domain (e.g. Vercel)
if (typeof process !== "undefined" && process.env?.NEXTAUTH_URL && !process.env.AUTH_URL) {
  process.env.AUTH_URL = process.env.NEXTAUTH_URL;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
        });

        if (!user || !user.isActive) {
          return null;
        }

        const isValid = await verifyPassword(
          credentials.password as string,
          user.passwordHash
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          avatar: user.avatar,
        } satisfies SessionUser;
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.username = (user as SessionUser).username;
        token.displayName = (user as SessionUser).displayName;
        token.role = (user as SessionUser).role;
        token.avatar = (user as SessionUser).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as SessionUser) = {
        id: token.id as string,
        username: token.username as string,
        displayName: token.displayName as string,
        role: token.role as SessionUser["role"],
        avatar: token.avatar as string | null,
      };
      return session;
    },
  },
});
