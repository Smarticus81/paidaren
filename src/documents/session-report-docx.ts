import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from "docx";

export async function buildSessionReportDocx(session: any): Promise<Buffer> {
  const doc = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 22 } } },
    },
    sections: [
      {
        properties: {
          page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: "SOCRATES — SESSION REPORT", bold: true, size: 24, color: "B8860B" })],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ text: session.activity.name, bold: true, size: 32, color: "1E2A44" })],
            spacing: { after: 400 },
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Student: ", bold: true }),
              new TextRun({ text: session.studentName }),
              new TextRun({ text: "     Date: ", bold: true }),
              new TextRun({ text: session.completedAt?.toDateString() ?? new Date().toDateString() }),
            ],
            spacing: { after: 400 },
          }),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            children: [new TextRun({ text: "Part 1 — Reasoning Analysis", bold: true, size: 28, color: "1E2A44" })],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Elements addressed: ", bold: true }),
              new TextRun({ text: session.report.elementsAddressed.join(", ") }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Elements missed: ", bold: true }),
              new TextRun({ text: session.report.elementsMissed.join(", ") || "None" }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Depth reached: ", bold: true }),
              new TextRun({ text: session.report.depthReached }),
            ],
          }),
          new Paragraph({ children: [new TextRun({ text: "", break: 1 })] }),
          new Paragraph({
            children: [new TextRun({ text: "Reasoning quality:", bold: true })],
          }),
          new Paragraph({
            children: [new TextRun({ text: session.report.reasoningQuality })],
            spacing: { after: 240 },
          }),
          ...(session.report.gapsFlagged.length > 0
            ? [
                new Paragraph({ children: [new TextRun({ text: "Gaps flagged for review:", bold: true })] }),
                ...session.report.gapsFlagged.map(
                  (g: string) => new Paragraph({ children: [new TextRun({ text: "• " + g })] }),
                ),
              ]
            : []),

          new Paragraph({
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 600 },
            children: [new TextRun({ text: "Part 2 — Full Transcript", bold: true, size: 28, color: "1E2A44" })],
          }),
          ...session.messages.flatMap((m: any) => [
            new Paragraph({
              children: [
                new TextRun({
                  text: m.role === "user" ? session.studentName + ":" : session.activity.coachName + ":",
                  bold: true,
                  color: m.role === "user" ? "1E2A44" : "B8860B",
                }),
              ],
              spacing: { before: 200 },
            }),
            new Paragraph({ children: [new TextRun({ text: m.content })] }),
          ]),
        ],
      },
    ],
  });

  return Packer.toBuffer(doc);
}
