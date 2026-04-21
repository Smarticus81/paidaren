import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { clearOldTelemetry } from "../actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

type SearchParams = Promise<{
  severity?: string;
  kind?: string;
  page?: string;
}>;

export default async function AdminTelemetryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const severity = sp.severity && ["DEBUG", "INFO", "WARN", "ERROR"].includes(sp.severity)
    ? (sp.severity as "DEBUG" | "INFO" | "WARN" | "ERROR")
    : undefined;
  const kindFilter = sp.kind?.trim() || undefined;
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);

  const where = {
    ...(severity ? { severity } : {}),
    ...(kindFilter ? { kind: { contains: kindFilter } } : {}),
  };

  const [events, total] = await Promise.all([
    prisma.telemetryEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.telemetryEvent.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div className="flex items-end justify-between mb-6">
        <div>
          <h1 className="text-3xl text-foreground mb-1">Telemetry</h1>
          <p className="text-muted text-sm">
            {total.toLocaleString()} event{total === 1 ? "" : "s"} match your filters.
          </p>
        </div>
        <form
          action={async () => {
            "use server";
            await clearOldTelemetry(30);
          }}
        >
          <button
            type="submit"
            className="text-xs bg-surface border border-border px-3 py-2 rounded-lg hover:bg-background transition-colors"
            title="Delete events older than 30 days"
          >
            Prune &gt; 30d
          </button>
        </form>
      </div>

      {/* Filters */}
      <form method="get" className="bg-surface border border-border rounded-2xl p-4 flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-[10px] uppercase tracking-wider font-medium text-muted mb-1">
            Severity
          </label>
          <select
            name="severity"
            defaultValue={severity ?? ""}
            className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="DEBUG">Debug</option>
            <option value="INFO">Info</option>
            <option value="WARN">Warn</option>
            <option value="ERROR">Error</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] uppercase tracking-wider font-medium text-muted mb-1">
            Kind contains
          </label>
          <input
            name="kind"
            type="text"
            defaultValue={kindFilter ?? ""}
            placeholder="e.g. coach."
            className="w-full bg-background border border-border rounded-lg px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="bg-accent text-white px-4 py-1.5 rounded-lg text-sm font-medium"
        >
          Apply
        </button>
      </form>

      {/* Event table */}
      {events.length === 0 ? (
        <div className="border border-dashed border-border rounded-2xl p-16 text-center">
          <p className="text-sm text-muted">No events match.</p>
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-2xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-background text-left">
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">Time</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">Severity</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">Kind</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">User</th>
                <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {events.map((e) => (
                <tr key={e.id} className="align-top">
                  <td className="px-4 py-3 text-xs text-muted whitespace-nowrap">
                    {formatTime(e.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <SeverityPill severity={e.severity} />
                  </td>
                  <td className="px-4 py-3">
                    <code className="text-xs text-foreground font-mono">{e.kind}</code>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">{e.userEmail ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-foreground">
                    <div className="line-clamp-2">{e.message ?? "—"}</div>
                    {e.metadata != null && (
                      <details className="mt-1">
                        <summary className="text-[10px] text-muted cursor-pointer">metadata</summary>
                        <pre className="text-[10px] text-muted whitespace-pre-wrap bg-background border border-border rounded-lg p-2 mt-1 max-w-2xl overflow-x-auto">
                          {JSON.stringify(e.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-xs text-muted">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            {page > 1 && (
              <a
                href={buildHref({ severity, kind: kindFilter, page: page - 1 })}
                className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:bg-background"
              >
                ← Prev
              </a>
            )}
            {page < totalPages && (
              <a
                href={buildHref({ severity, kind: kindFilter, page: page + 1 })}
                className="px-3 py-1.5 bg-surface border border-border rounded-lg hover:bg-background"
              >
                Next →
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function buildHref({
  severity,
  kind,
  page,
}: {
  severity?: string;
  kind?: string;
  page: number;
}): string {
  const params = new URLSearchParams();
  if (severity) params.set("severity", severity);
  if (kind) params.set("kind", kind);
  params.set("page", String(page));
  return `/admin/telemetry?${params.toString()}`;
}

function SeverityPill({ severity }: { severity: "DEBUG" | "INFO" | "WARN" | "ERROR" }) {
  const cls =
    severity === "ERROR"
      ? "bg-rose-50 text-rose-700 border-rose-200"
      : severity === "WARN"
        ? "bg-amber-50 text-amber-700 border-amber-200"
        : severity === "DEBUG"
          ? "bg-slate-50 text-slate-600 border-slate-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200";
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${cls}`}>
      {severity}
    </span>
  );
}

function formatTime(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19);
}
