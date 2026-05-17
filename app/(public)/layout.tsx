import { SiteNav } from "@/components/sections/site-nav";
import { SiteFooter } from "@/components/sections/site-footer";
import { getCurrentProfile } from "@/lib/auth";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav profile={profile} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
