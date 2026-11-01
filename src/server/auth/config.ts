import "server-only";

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";

import { emailField } from "@/features/identity/validation";
import { getServerEnv } from "@/lib/config/env";
import { getDatabase } from "@/server/db/client";

import { verifyPassword } from "./password";

const DUMMY_PASSWORD_HASH =
  "$argon2id$v=19$m=19456,t=2,p=1$bPz++my3B+V51cll/U9LAQ$AAQCk0445FXvokrvdYPifa7RlE+Dm3UaaCs1AIK69SU";

const credentialsSchema = z.object({
  email: emailField,
  password: z.string().min(1).max(128),
});

const env = getServerEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: env.AUTH_SECRET,
  trustHost: env.NODE_ENV !== "production",
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60,
    updateAge: 24 * 60 * 60,
  },
  pages: {
    signIn: "/sign-in",
  },
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);

        if (!parsed.success) {
          return null;
        }

        const user = await getDatabase().user.findUnique({
          where: { email: parsed.data.email },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            status: true,
          },
        });

        const passwordMatches = await verifyPassword(
          user?.passwordHash ?? DUMMY_PASSWORD_HASH,
          parsed.data.password,
        );

        if (!user || !user.passwordHash || !passwordMatches || user.status !== "ACTIVE") {
          return null;
        }

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (!token.sub) {
        return null;
      }

      const account = await getDatabase().user.findUnique({
        where: { id: token.sub },
        select: {
          role: true,
          status: true,
          sessionVersion: true,
          vendor: { select: { id: true, status: true } },
        },
      });

      if (!account || account.status !== "ACTIVE") {
        return null;
      }

      if (!user && token.sessionVersion !== account.sessionVersion) {
        return null;
      }

      token.sessionVersion = account.sessionVersion;
      token.role = account.role;
      token.status = account.status;
      token.vendorId = account.vendor?.id ?? null;
      token.vendorStatus = account.vendor?.status ?? null;

      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role ?? "CUSTOMER";
      session.user.status = token.status ?? "SUSPENDED";
      session.user.vendorId = token.vendorId ?? null;
      session.user.vendorStatus = token.vendorStatus ?? null;

      return session;
    },
  },
});
