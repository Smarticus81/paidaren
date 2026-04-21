import { prisma } from "./db";

export type TelemetrySeverity = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type TelemetryInput = {
  kind: string;
  severity?: TelemetrySeverity;
  message?: string;
  metadata?: Record<string, unknown>;
  userId?: string | null;
  userEmail?: string | null;
  path?: string | null;
  durationMs?: number | null;
};

export async function logEvent(input: TelemetryInput): Promise<void> {
  try {
    await prisma.telemetryEvent.create({
      data: {
        kind: input.kind,
        severity: input.severity ?? "INFO",
        message: input.message ?? null,
        metadata: input.metadata ? (input.metadata as object) : undefined,
        userId: input.userId ?? null,
        userEmail: input.userEmail ?? null,
        path: input.path ?? null,
        durationMs: input.durationMs ?? null,
      },
    });
  } catch (err) {
    // Telemetry must never break the caller. Fall back to console.
    console.warn("[telemetry] failed to persist event", input.kind, err);
  }
}

export async function logError(
  kind: string,
  err: unknown,
  extra: Omit<TelemetryInput, "kind" | "severity" | "message"> = {},
): Promise<void> {
  const message = err instanceof Error ? err.message : String(err);
  await logEvent({
    kind,
    severity: "ERROR",
    message,
    ...extra,
    metadata: {
      ...(extra.metadata ?? {}),
      stack: err instanceof Error ? err.stack : undefined,
    },
  });
}
