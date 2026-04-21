import Link from "next/link";
import { signOut } from "@/lib/auth";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/admin" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-accent text-sm font-bold font-serif">A</span>
              </div>
              <span className="text-sm font-semibold tracking-wide text-foreground">
                Paidaren Admin
              </span>
            </Link>
            <nav className="flex gap-1 text-sm">
              <AdminNavLink href="/admin" label="Overview" />
              <AdminNavLink href="/admin/users" label="Users" />
              <AdminNavLink href="/admin/telemetry" label="Telemetry" />
              <AdminNavLink href="/admin/settings" label="Settings" />
              <Link
                href="/"
                className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-all"
              >
                ← App
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted">{admin.email}</span>
            <span className="text-[10px] uppercase tracking-[0.15em] font-medium bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full">
              Admin
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button
                type="submit"
                className="text-xs text-muted hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-background transition-all"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-8 py-8">{children}</main>
    </div>
  );
}

function AdminNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-all"
    >
      {label}
    </Link>
  );
}
