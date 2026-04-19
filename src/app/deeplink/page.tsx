import { prisma } from "@/lib/db";
import { ActivityPicker } from "@/components/deeplink/ActivityPicker";

export default async function DeepLinkPickerPage({
  searchParams,
}: {
  searchParams: Promise<{ platform?: string; deploymentId?: string; returnUrl?: string; data?: string }>;
}) {
  const { platform, deploymentId, returnUrl, data } = await searchParams;

  const activities = await prisma.activity.findMany({
    where: { published: true },
    select: { id: true, name: true, subjectTag: true, briefContext: true, rigor: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="min-h-screen bg-slate-50">
      <ActivityPicker
        activities={activities}
        platformId={platform ?? ""}
        deploymentId={deploymentId ?? ""}
        returnUrl={returnUrl ?? ""}
        data={data ?? ""}
      />
    </div>
  );
}
