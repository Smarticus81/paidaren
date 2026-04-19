import { Document, Page, Text, View, StyleSheet, pdf } from "@react-pdf/renderer";
import React from "react";

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica" },
  brand: { fontSize: 9, color: "#B8860B", letterSpacing: 2, marginBottom: 4 },
  title: { fontSize: 20, color: "#1E2A44", fontWeight: 700, marginBottom: 16 },
  meta: { fontSize: 10, color: "#1B1F24", marginBottom: 24 },
  h1: { fontSize: 14, color: "#1E2A44", fontWeight: 700, marginTop: 16, marginBottom: 8 },
  rule: { borderBottomWidth: 2, borderBottomColor: "#B8860B", width: 36, marginBottom: 12 },
  label: { fontSize: 10, fontWeight: 700, color: "#1B1F24" },
  body: { fontSize: 10, color: "#1B1F24", marginBottom: 6, lineHeight: 1.5 },
  msgUser: { fontSize: 10, color: "#1E2A44", fontWeight: 700, marginTop: 10 },
  msgCoach: { fontSize: 10, color: "#B8860B", fontWeight: 700, marginTop: 10 },
  msgText: { fontSize: 10, color: "#1B1F24", marginBottom: 4, lineHeight: 1.5 },
});

export async function renderSessionReportPdf(session: any): Promise<Buffer> {
  const element = (
    <Document>
      <Page size="LETTER" style={styles.page}>
        <Text style={styles.brand}>SOCRATES · SESSION REPORT</Text>
        <Text style={styles.title}>{session.activity.name}</Text>
        <Text style={styles.meta}>
          Student: {session.studentName}    Date: {(session.completedAt ?? new Date()).toDateString()}
        </Text>

        <Text style={styles.h1}>Part 1 — Reasoning Analysis</Text>
        <View style={styles.rule} />
        <Text style={styles.body}>
          <Text style={styles.label}>Elements addressed: </Text>
          {session.report.elementsAddressed.join(", ")}
        </Text>
        <Text style={styles.body}>
          <Text style={styles.label}>Elements missed: </Text>
          {session.report.elementsMissed.join(", ") || "None"}
        </Text>
        <Text style={styles.body}>
          <Text style={styles.label}>Depth reached: </Text>
          {session.report.depthReached}
        </Text>
        <Text style={[styles.label, { marginTop: 10 }]}>Reasoning quality:</Text>
        <Text style={styles.body}>{session.report.reasoningQuality}</Text>
        {session.report.gapsFlagged.length > 0 && (
          <>
            <Text style={[styles.label, { marginTop: 8 }]}>Gaps flagged:</Text>
            {session.report.gapsFlagged.map((g: string, i: number) => (
              <Text key={i} style={styles.body}>
                •  {g}
              </Text>
            ))}
          </>
        )}

        <Text style={styles.h1}>Part 2 — Full Transcript</Text>
        <View style={styles.rule} />
        {session.messages.map((m: any, i: number) => (
          <View key={i}>
            <Text style={m.role === "user" ? styles.msgUser : styles.msgCoach}>
              {m.role === "user" ? session.studentName : session.activity.coachName}:
            </Text>
            <Text style={styles.msgText}>{m.content}</Text>
          </View>
        ))}
      </Page>
    </Document>
  );

  const instance = pdf(element);
  const blob = await instance.toBlob();
  return Buffer.from(await blob.arrayBuffer());
}
