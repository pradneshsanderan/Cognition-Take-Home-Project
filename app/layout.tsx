import type { Metadata } from "next";
import Link from "next/link";
import { UserSwitcher } from "@/components/UserSwitcher";
import { currentActor, listUsers } from "@/lib/identity";
import { canViewAudit, visibleApps } from "@/lib/permissions";
import "./globals.css";

export const metadata: Metadata = {
  title: "Internal Tools",
  description: "Config-driven internal tools platform",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [actor, users] = await Promise.all([currentActor(), listUsers()]);
  const apps = visibleApps(actor);

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-slate-50 text-slate-900">
        <header className="border-b border-slate-200 bg-white">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Internal Tools
            </Link>
            <nav className="flex flex-wrap items-center gap-4 text-sm text-slate-500">
              {apps.map((app) => (
                <Link key={app.slug} href={`/${app.slug}`} className="hover:text-slate-900">
                  {app.config.name}
                </Link>
              ))}
              {canViewAudit(actor) ? (
                <Link href="/audit" className="hover:text-slate-900">
                  Audit log
                </Link>
              ) : null}
            </nav>
            <div className="ml-auto">
              <UserSwitcher users={users} currentEmail={actor?.email ?? null} />
            </div>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">{children}</main>
      </body>
    </html>
  );
}
