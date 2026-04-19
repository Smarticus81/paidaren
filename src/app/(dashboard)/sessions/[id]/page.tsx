import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const session = await prisma.coachSession.findUnique({
    where: { id },
    include: {
      activity: true,
      messages: { orderBy: { createdAt: "asc" } },
      report: true,
    },
  });

  if (!session) notFound();

  return (
    <div>
      <Link href={`/activities/${session.activityId}/sessions`} className="text-sm text-slate-500 hover:text-slate-900 mb-4 block">
        &larr; Back to sessions
      </Link>

      <div className="grid lg:grid-cols-[2fr_1fr] gap-6">
        <div>
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h1 className="text-xl font-bold text-slate-900 mb-1">{session.activity.name}</h1>
            <div className="flex gap-4 text-sm text-slate-500 mb-4">
              <span>Student: <strong className="text-slate-900">{session.studentName ?? "—"}</strong></span>
              <span>Turns: {session.turnCount} / {session.activity.turnLimit}</span>
              <span>End: {session.endReason ?? "In progress"}</span>
            </div>
            <div className="flex gap-3">
              <a
                href={`/api/report/${session.id}/pdf`}
                className="bg-slate-900 text-white px-4 py-1.5 rounded-full text-sm font-semibold"
              >
                Download PDF
              </a>
              <a
                href={`/api/report/${session.id}/docx`}
                className="bg-white text-slate-900 border-2 border-slate-300 px-4 py-1.5 rounded-full text-sm font-semibold"
              >
                Download Word
              </a>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Transcript</h2>
            <div className="space-y-4">
              {session.messages.map((m: any) => (
                <div key={m.id}>
                  <div
                    className={`text-xs uppercase tracking-wider font-bold mb-1 ${
                      m.role === "user" ? "text-slate-700" : "text-amber-700"
                    }`}
                  >
                    {m.role === "user" ? session.studentName ?? "Student" : session.activity.coachName}
                  </div>
                  <p className="text-sm text-slate-800 whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {session.report && (
          <div className="bg-white rounded-lg shadow p-6 h-fit">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Reasoning Analysis</h2>
            <div className="space-y-4 text-sm">
              <div>
                <div className="font-semibold text-slate-900 mb-1">Elements Addressed</div>
                <ul className="list-disc list-inside text-slate-700">
                  {session.report.elementsAddressed.map((e: string, i: number) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="font-semibold text-slate-900 mb-1">Elements Missed</div>
                {session.report.elementsMissed.length > 0 ? (
                  <ul className="list-disc list-inside text-slate-700">
                    {session.report.elementsMissed.map((e: string, i: number) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500">None</p>
                )}
              </div>
              <div>
                <div className="font-semibold text-slate-900 mb-1">Depth Reached</div>
                <p className="text-slate-700">{session.report.depthReached}</p>
              </div>
              <div>
                <div className="font-semibold text-slate-900 mb-1">Reasoning Quality</div>
                <p className="text-slate-700">{session.report.reasoningQuality}</p>
              </div>
              {session.report.gapsFlagged.length > 0 && (
                <div>
                  <div className="font-semibold text-slate-900 mb-1">Gaps Flagged</div>
                  <ul className="list-disc list-inside text-slate-700">
                    {session.report.gapsFlagged.map((g: string, i: number) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
