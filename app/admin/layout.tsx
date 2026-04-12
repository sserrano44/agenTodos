import Link from "next/link";

import { logoutAction } from "@/app/login/actions";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { requireAdminSession } from "@/lib/auth/admin";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdminSession();

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,rgba(255,255,255,0.75),rgba(246,248,250,0.98))]">
      <header className="border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-6 py-5 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex flex-col gap-1">
            <Link href="/admin" className="text-xl font-semibold tracking-tight">
              Agent Todos
            </Link>
            <div className="text-sm text-muted-foreground">
              Workspace {session.activeWorkspace.name} • {session.user.email}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <AdminNav />
            <form action={logoutAction}>
              <Button variant="outline" type="submit">
                Log out
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-8 md:px-8">
        {children}
      </main>
    </div>
  );
}
