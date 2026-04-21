import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "./db";
import { logEvent } from "./telemetry";

// Emails that are always granted ADMIN access when they sign in.
const BOOTSTRAP_ADMINS = new Set(
  (process.env.BOOTSTRAP_ADMIN_EMAILS ?? "hazvimusoni@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({ from: process.env.EMAIL_FROM ?? "noreply@paidaren.com", apiKey: process.env.RESEND_API_KEY }),
  ],
  pages: { signIn: "/signin" },
  session: { strategy: "database" },
  callbacks: {
    async signIn({ user }) {
      // Block disabled users at the door.
      if (user?.email) {
        const existing = await prisma.user.findUnique({
          where: { email: user.email },
          select: { disabled: true },
        });
        if (existing?.disabled) return false;
      }
      return true;
    },
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      if (!user?.id || !user.email) return;

      const email = user.email.toLowerCase();
      const shouldBootstrapAdmin = BOOTSTRAP_ADMINS.has(email);

      await prisma.user.update({
        where: { id: user.id },
        data: {
          lastSeenAt: new Date(),
          ...(shouldBootstrapAdmin ? { role: "ADMIN", disabled: false } : {}),
        },
      });

      await logEvent({
        kind: "auth.signin",
        severity: "INFO",
        message: shouldBootstrapAdmin ? "Bootstrap admin signed in" : "User signed in",
        userId: user.id,
        userEmail: user.email,
      });
    },
    async signOut(message) {
      const userId =
        "token" in message ? message.token?.sub : message.session?.userId;
      await logEvent({
        kind: "auth.signout",
        severity: "INFO",
        userId: typeof userId === "string" ? userId : null,
      });
    },
  },
});
