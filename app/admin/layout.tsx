import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth";

export const metadata = {
  title: "Admin — RareOcto",
  robots: { index: false, follow: false },
};

// Belt-and-braces — middleware already gates /admin by role, but if the
// middleware matcher ever changes, this layout still refuses non-admins.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/admin/products");
  if (profile.role !== "admin") redirect("/");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-6 px-4 py-4 sm:px-6">
          <Link href="/admin/products" className="flex items-baseline gap-2">
            <span className="font-display text-lg font-bold tracking-tight">RareOcto</span>
            <span className="font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
              admin
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link
              href="/admin/products"
              className="text-muted-foreground transition hover:text-foreground"
            >
              Products
            </Link>
            <Link
              href="/"
              className="text-muted-foreground transition hover:text-foreground"
            >
              View site
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6">
        {children}
      </main>
    </div>
  );
}
