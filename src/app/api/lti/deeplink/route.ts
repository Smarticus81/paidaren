import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createDeepLinkingResponse } from "@/lib/lti/deep-linking";
import { z } from "zod";

const DeepLinkSchema = z.object({
  platformId: z.string(),
  activityId: z.string(),
  deploymentId: z.string(),
  returnUrl: z.string().url(),
  data: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { platformId, activityId, deploymentId, returnUrl, data } = DeepLinkSchema.parse(body);

  const platform = await prisma.platform.findUniqueOrThrow({ where: { id: platformId } });
  const activity = await prisma.activity.findUniqueOrThrow({ where: { id: activityId } });

  const form = await createDeepLinkingResponse({
    settings: {
      deep_link_return_url: returnUrl,
      data: data || undefined,
      accept_types: ["ltiResourceLink"],
      accept_presentation_document_targets: ["iframe", "window"],
    },
    contentItems: [
      {
        type: "ltiResourceLink",
        title: activity.name,
        url: `${process.env.APP_URL}/api/lti/launch`,
        custom: { socrates_activity_id: activity.id },
      },
    ],
    deploymentId,
    audience: platform.issuer,
    message: `Socrates activity "${activity.name}" added.`,
  });

  return new NextResponse(form, {
    headers: { "Content-Type": "text/html" },
  });
}
