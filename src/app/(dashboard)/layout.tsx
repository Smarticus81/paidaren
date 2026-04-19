import { auth, signOut } from "@/lib/auth";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface">
        <div className="max-w-5xl mx-auto px-8 py-5 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center">
                <span className="text-white text-xs font-bold font-serif">S</span>
              </div>
              <span className="text-sm font-semibold tracking-wide text-foreground">
                Socrates
              </span>
            </Link>
            <nav className="flex gap-6 text-sm">
              <Link href="/" className="text-muted hover:text-foreground transition-colors">
                Activities
              </Link>
              <Link href="/activities/new" className="text-muted hover:text-foreground transition-colors">
                New
              </Link>
              <Link href="/settings" className="text-muted hover:text-foreground transition-colors">
                Settings
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-5">
            <span className="text-sm text-muted">{session.user.email}</span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/signin" });
              }}
            >
              <button type="submit" className="text-sm text-muted hover:text-foreground transition-colors">
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-8 py-10">{children}</main>
    </div>
  );
}
