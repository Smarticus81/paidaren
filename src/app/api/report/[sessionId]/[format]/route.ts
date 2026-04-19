import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { renderSessionReportPdf } from "@/documents/SessionReportPdf";
import { buildSessionReportDocx } from "@/documents/session-report-docx";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string; format: string }> },
) {
  const { sessionId, format } = await params;
  if (format !== "pdf" && format !== "docx") {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  const session = await prisma.coachSession.findUniqueOrThrow({
    where: { id: sessionId },
    include: {
      activity: true,
      messages: { orderBy: { createdAt: "asc" } },
      report: true,
    },
  });

  if (!session.report) {
    return NextResponse.json({ error: "Report not ready" }, { status: 404 });
  }

  if (format === "pdf") {
    const buffer = await renderSessionReportPdf(session);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="socrates-${session.activity.name.replace(/\s+/g, "-")}-${session.id.slice(0, 8)}.pdf"`,
      },
    });
  }

  const buffer = await buildSessionReportDocx(session);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="socrates-${session.activity.name.replace(/\s+/g, "-")}-${session.id.slice(0, 8)}.docx"`,
    },
  });
}
