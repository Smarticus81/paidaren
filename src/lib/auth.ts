import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({ from: process.env.EMAIL_FROM ?? "noreply@paidaren.com", apiKey: process.env.RESEND_API_KEY }),
  ],
  pages: { signIn: "/signin" },
  session: { strategy: "database" },
  callbacks: {
    session({ session, user }) {
      if (session.user) session.user.id = user.id;
      return session;
    },
  },
});
