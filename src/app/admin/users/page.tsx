import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { setUserDisabled, updateUserRole } from "../actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      disabled: true,
      lastSeenAt: true,
      createdAt: true,
      _count: {
        select: {
          createdActivities: true,
          sessions: true,
        },
      },
    },
  });

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl text-foreground mb-1">Users</h1>
          <p className="text-muted text-sm">
            Manage roles, access, and activity. {users.length} user{users.length === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      <div className="bg-surface border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-background text-left">
              <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">User</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">Role</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">Last seen</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">Activities</th>
              <th className="px-4 py-3 text-xs uppercase tracking-wider font-medium text-muted">Access</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {users.map((u) => {
              const isSelf = u.id === admin.id;
              return (
                <tr key={u.id} className={u.disabled ? "bg-rose-50/30" : ""}>
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{u.name ?? "—"}</div>
                    <div className="text-xs text-muted">{u.email}</div>
                  </td>
                  <td className="px-4 py-3">
                    <form
                      action={async (fd: FormData) => {
                        "use server";
                        const role = String(fd.get("role") ?? "");
                        await updateUserRole(u.id, role);
                      }}
                      className="flex items-center gap-2"
                    >
                      <select
                        name="role"
                        defaultValue={u.role}
                        disabled={isSelf}
                        className="bg-background border border-border rounded-lg px-2 py-1 text-xs"
                      >
                        <option value="INSTRUCTIONAL_DESIGNER">Designer</option>
                        <option value="ADMIN">Admin</option>
                      </select>
                      <button
                        type="submit"
                        disabled={isSelf}
                        className="text-xs text-accent hover:underline disabled:text-muted disabled:no-underline"
                      >
                        Save
                      </button>
                    </form>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    {u.lastSeenAt ? relativeTime(u.lastSeenAt) : "—"}
                    <div className="text-[10px]">
                      joined {relativeTime(u.createdAt)}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted">
                    <div>{u._count.createdActivities} created</div>
                    <div>{u._count.sessions} test sessions</div>
                  </td>
                  <td className="px-4 py-3">
                    {u.disabled ? (
                      <form
                        action={async () => {
                          "use server";
                          await setUserDisabled(u.id, false);
                        }}
                      >
                        <button
                          type="submit"
                          className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full font-medium hover:bg-emerald-100 transition-colors"
                        >
                          Restore
                        </button>
                      </form>
                    ) : (
                      <form
                        action={async () => {
                          "use server";
                          await setUserDisabled(u.id, true);
                        }}
                      >
                        <button
                          type="submit"
                          disabled={isSelf}
                          className="text-xs bg-background text-rose-700 border border-rose-200 px-3 py-1 rounded-full font-medium hover:bg-rose-50 transition-colors disabled:opacity-40"
                        >
                          {isSelf ? "You" : "Disable"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function relativeTime(d: Date): string {
  const diff = Date.now() - d.getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return `${days}d ago`;
}
