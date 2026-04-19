import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleDynamicRegistration } from "@/lib/lti/dynamic-registration";

// Dynamic Registration endpoint.
// LMS admin pastes: https://paidaren.com/api/lti/register
// The LMS calls this URL with openid_configuration and registration_token.

export async function GET(req: NextRequest) {
  const openidConfiguration = req.nextUrl.searchParams.get("openid_configuration");
  const registrationToken = req.nextUrl.searchParams.get("registration_token") ?? undefined;

  if (!openidConfiguration) {
    return NextResponse.json(
      { error: "Missing openid_configuration parameter. This URL is used for LTI Dynamic Registration — your LMS should provide the openid_configuration query parameter." },
      { status: 400 },
    );
  }

  try {
    const result = await handleDynamicRegistration({ openidConfiguration, registrationToken });

    // Save the platform registration
    await prisma.platform.upsert({
      where: { issuer_clientId: { issuer: result.issuer, clientId: result.clientId } },
      create: {
        issuer: result.issuer,
        clientId: result.clientId,
        authorizationEndpoint: result.authorizationEndpoint,
        tokenEndpoint: result.tokenEndpoint,
        jwksUri: result.jwksUri,
        deploymentId: result.deploymentId,
        active: true,
      },
      update: {
        authorizationEndpoint: result.authorizationEndpoint,
        tokenEndpoint: result.tokenEndpoint,
        jwksUri: result.jwksUri,
        deploymentId: result.deploymentId,
        active: true,
      },
    });

    // Return success page
    const html = `
<!DOCTYPE html>
<html>
<head><title>Socrates — Registration Complete</title></head>
<body style="font-family: system-ui; max-width: 500px; margin: 80px auto; text-align: center;">
  <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2px; color: #B8860B; font-weight: bold; margin-bottom: 8px;">SOCRATES</div>
  <h1 style="color: #1E2A44; margin-bottom: 16px;">Registration Complete</h1>
  <p style="color: #475569;">Socrates has been registered with your LMS. You can now add Socratic coaching activities to your courses.</p>
  <p style="color: #94A3B8; font-size: 14px; margin-top: 24px;">You may close this window.</p>
</body>
</html>`;

    return new NextResponse(html, { headers: { "Content-Type": "text/html" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Registration failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
