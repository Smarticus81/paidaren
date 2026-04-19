export default async function BlockedPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white rounded-lg shadow p-8 max-w-md text-center">
        <div className="text-xs uppercase tracking-widest text-amber-700 font-bold mb-4">
          SOCRATES
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-4">Session Unavailable</h1>
        <p className="text-slate-600">
          {reason ?? "You are not able to start a session at this time."}
        </p>
      </div>
    </div>
  );
}
