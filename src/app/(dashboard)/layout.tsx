import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                <span className="text-accent text-sm font-bold font-serif">S</span>
              </div>
              <span className="text-sm font-semibold tracking-wide text-foreground">
                Paidaren
              </span>
            </Link>
            <nav className="flex gap-1 text-sm">
              <Link href="/" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-all">
                Dashboard
              </Link>
              <Link href="/activities/new" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-all">
                New
              </Link>
              <Link href="/settings" className="px-3 py-1.5 rounded-lg text-muted hover:text-foreground hover:bg-background transition-all">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button type="submit" className="text-xs text-muted hover:text-foreground px-3 py-1.5 rounded-lg hover:bg-background transition-all">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-8 py-8">{children}</main>
    </div>
  );
}
