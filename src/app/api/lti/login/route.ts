import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import * as crypto from "crypto";

// OIDC Login Initiation — Step 1 of the LTI 1.3 launch flow.
// The LMS sends the student here. We redirect back to the LMS's
// authorization endpoint with an authentication request.

export async function GET(req: NextRequest) {
  return handleLogin(req);
}

export async function POST(req: NextRequest) {
  return handleLogin(req);
}

async function handleLogin(req: NextRequest) {
  const params = req.method === "GET"
    ? Object.fromEntries(req.nextUrl.searchParams)
    : Object.fromEntries(new URLSearchParams(await req.text()));

  const iss = params.iss;
  const loginHint = params.login_hint;
  const targetLinkUri = params.target_link_uri;
  const ltiMessageHint = params.lti_message_hint;
  const clientId = params.client_id;

  if (!iss || !loginHint) {
    return NextResponse.json({ error: "Missing iss or login_hint" }, { status: 400 });
  }

  // Find the registered platform
  const platform = clientId
    ? await prisma.platform.findUnique({ where: { issuer_clientId: { issuer: iss, clientId } } })
    : await prisma.platform.findFirst({ where: { issuer: iss, active: true } });

  if (!platform) {
    return NextResponse.json({ error: "Unregistered platform" }, { status: 403 });
  }

  const state = crypto.randomBytes(32).toString("hex");
  const nonce = crypto.randomBytes(32).toString("hex");

  // Build the OIDC authorization URL
  const authUrl = new URL(platform.authorizationEndpoint);
  authUrl.searchParams.set("scope", "openid");
  authUrl.searchParams.set("response_type", "id_token");
  authUrl.searchParams.set("client_id", platform.clientId);
  authUrl.searchParams.set("redirect_uri", `${process.env.APP_URL}/api/lti/launch`);
  authUrl.searchParams.set("login_hint", loginHint);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);
  authUrl.searchParams.set("response_mode", "form_post");
  authUrl.searchParams.set("prompt", "none");
  if (ltiMessageHint) {
    authUrl.searchParams.set("lti_message_hint", ltiMessageHint);
  }

  // Store state and nonce in a short-lived cookie for validation
  const res = NextResponse.redirect(authUrl.toString());
  res.cookies.set("lti_state", JSON.stringify({ state, nonce, platformId: platform.id }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "none",
    maxAge: 300, // 5 minutes
    path: "/",
  });

  return res;
}
