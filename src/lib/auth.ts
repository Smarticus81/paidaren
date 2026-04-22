import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Resend from "next-auth/providers/resend";
import { prisma } from "./db";
import { logEvent, logError } from "./telemetry";

// Emails that are always granted ADMIN access when they sign in.
const BOOTSTRAP_ADMINS = new Set(
  (process.env.BOOTSTRAP_ADMIN_EMAILS ?? "hazvimusoni@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? process.env.AUTH_RESEND_KEY;

// Resend's `onboarding@resend.dev` works without verifying a domain — safe
// fallback when EMAIL_FROM is unset. Production should set EMAIL_FROM to a
// verified-domain address (e.g. noreply@paidaren.com once verified in Resend).
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Paidaren <onboarding@resend.dev>";

function buildEmailHtml(url: string, host: string): string {
  return `<!doctype html>
<html><body style="font-family: -apple-system, system-ui, sans-serif; background:#f8fafc; padding:40px 20px;">
  <div style="max-width:480px; margin:0 auto; background:white; border-radius:12px; padding:32px; box-shadow:0 1px 3px rgba(0,0,0,0.06);">
    <div style="font-size:11px; letter-spacing:2px; color:#b45309; font-weight:700; text-transform:uppercase; margin-bottom:16px;">Paidaren</div>
    <h1 style="font-size:20px; color:#0f172a; margin:0 0 16px;">Sign in to ${host}</h1>
    <p style="font-size:14px; color:#475569; line-height:1.5; margin:0 0 24px;">Click the button below to sign in. This link expires in 24 hours and can only be used once.</p>
    <a href="${url}" style="display:inline-block; background:#0f172a; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:600; font-size:14px;">Sign in</a>
    <p style="font-size:12px; color:#94a3b8; margin:24px 0 0; line-height:1.5;">If you didn't request this, you can safely ignore this email.</p>
  </div>
</body></html>`;
}

function buildEmailText(url: string, host: string): string {
  return `Sign in to ${host}\n\n${url}\n\nIf you didn't request this, you can safely ignore this email.`;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  // Required on Vercel: the deployment is reached via many hostnames
  // (custom domain, *.vercel.app previews) and we rely on Vercel's edge
  // to set a trustworthy Host header.
  trustHost: true,
  providers: [
    Resend({
      apiKey: RESEND_API_KEY,
      from: EMAIL_FROM,
      // Override the default sender so we can log failures with detail and
      // use a richer email body. Throwing here causes Auth.js to surface
      // EmailSignin errors to the /signin?error=... page.
      async sendVerificationRequest({ identifier: to, url, provider }) {
        if (!RESEND_API_KEY) {
          await logError("auth.email.misconfigured", new Error("RESEND_API_KEY is not set"), {
            userEmail: to,
          });
          throw new Error("Email service is not configured. Please contact support.");
        }

        const { host } = new URL(url);
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to,
            subject: `Sign in to ${host}`,
            html: buildEmailHtml(url, host),
            text: buildEmailText(url, host),
          }),
        });

        if (!res.ok) {
          let errorBody: unknown;
          try {
            errorBody = await res.json();
          } catch {
            errorBody = await res.text().catch(() => "<unreadable>");
          }
          await logError(
            "auth.email.send_failed",
            new Error(`Resend ${res.status}: ${JSON.stringify(errorBody)}`),
            {
              userEmail: to,
              metadata: { status: res.status, from: provider.from, body: errorBody },
            },
          );
          throw new Error(`Resend error (${res.status}): ${JSON.stringify(errorBody)}`);
        }

        await logEvent({
          kind: "auth.email.sent",
          severity: "INFO",
          message: "Magic link delivered",
          userEmail: to,
          metadata: { from: provider.from },
        });
      },
    }),
  ],
  pages: { signIn: "/signin", verifyRequest: "/signin?sent=1", error: "/signin" },
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
