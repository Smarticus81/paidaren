import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyLtiToken } from "@/lib/lti/keys";
import { parseLtiClaims, LTI_CLAIMS } from "@/lib/lti/claims";
import { canStudentStartSession, resumableSession } from "@/lib/session-engine";

// LTI 1.3 Launch — Step 2 of the OIDC flow.
// The LMS posts back with an id_token after the student authenticates.

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const idToken = formData.get("id_token") as string | null;
  const state = formData.get("state") as string | null;

  if (!idToken) {
    return NextResponse.json({ error: "Missing id_token" }, { status: 400 });
  }

  // Retrieve and validate the state cookie
  const stateCookie = req.cookies.get("lti_state")?.value;
  if (!stateCookie) {
    return NextResponse.json({ error: "Missing state cookie — third-party cookies may be blocked" }, { status: 400 });
  }

  let stateData: { state: string; nonce: string; platformId: string };
  try {
    stateData = JSON.parse(stateCookie);
  } catch {
    return NextResponse.json({ error: "Invalid state cookie" }, { status: 400 });
  }

  if (state && state !== stateData.state) {
    return NextResponse.json({ error: "State mismatch" }, { status: 403 });
  }

  // Look up the platform
  const platform = await prisma.platform.findUnique({ where: { id: stateData.platformId } });
  if (!platform || !platform.active) {
    return NextResponse.json({ error: "Platform not found or inactive" }, { status: 403 });
  }

  // Verify the id_token JWT against the platform's JWKS
  let payload: Record<string, unknown>;
  try {
    payload = await verifyLtiToken(idToken, platform) as Record<string, unknown>;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Token verification failed";
    return NextResponse.json({ error: msg }, { status: 401 });
  }

  // Verify nonce
  if (payload.nonce !== stateData.nonce) {
    return NextResponse.json({ error: "Nonce mismatch" }, { status: 403 });
  }

  const claims = parseLtiClaims(payload);

  // Check message type — handle Deep Linking requests
  if (claims.messageType === "LtiDeepLinkingRequest") {
    const dlSettings = payload[LTI_CLAIMS.DEEP_LINKING_SETTINGS] as Record<string, unknown> | undefined;
    const res = NextResponse.redirect(
      new URL(
        `/deeplink?platform=${platform.id}&deploymentId=${claims.deploymentId}&returnUrl=${encodeURIComponent(
          (dlSettings?.deep_link_return_url as string) ?? ""
        )}&data=${encodeURIComponent((dlSettings?.data as string) ?? "")}`,
        req.url,
      ),
    );
    // Clear the state cookie
    res.cookies.delete("lti_state");
    return res;
  }

  // Regular LtiResourceLinkRequest
  const customParams = claims.custom ?? {};
  const activityId = customParams.socrates_activity_id;

  if (!activityId) {
    // No activity specified — redirect to deeplink picker
    const res = NextResponse.redirect(
      new URL(`/deeplink?platform=${platform.id}`, req.url),
    );
    res.cookies.delete("lti_state");
    return res;
  }

  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity || !activity.published) {
    return NextResponse.json({ error: "Activity not found or not published" }, { status: 404 });
  }

  const launch = await prisma.ltiLaunch.create({
    data: {
      platformId: platform.id,
      activityId: activity.id,
      ltiUserId: claims.sub,
      courseId: claims.context.id,
      courseName: claims.context.title ?? null,
      resourceLinkId: claims.resourceLink.id,
    },
  });

  const check = await canStudentStartSession({
    activityId: activity.id,
    studentLtiSub: claims.sub,
  });

  if (!check.allowed) {
    const res = NextResponse.redirect(
      new URL(`/coach/blocked?reason=${encodeURIComponent(check.reason ?? "Not allowed")}`, req.url),
    );
    res.cookies.delete("lti_state");
    return res;
  }

  const resumable = await resumableSession({
    activityId: activity.id,
    studentLtiSub: claims.sub,
  });

  if (resumable) {
    const res = NextResponse.redirect(new URL(`/coach/${resumable.id}`, req.url));
    res.cookies.delete("lti_state");
    return res;
  }

  const session = await prisma.coachSession.create({
    data: {
      activityId: activity.id,
      launchId: launch.id,
      studentLtiSub: claims.sub,
    },
  });

  const res = NextResponse.redirect(new URL(`/coach/${session.id}`, req.url));
  res.cookies.delete("lti_state");
  return res;
}
