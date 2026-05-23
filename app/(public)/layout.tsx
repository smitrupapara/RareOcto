import { SiteNav } from "@/components/sections/site-nav";
import { SiteFooter } from "@/components/sections/site-footer";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { getCartCount } from "@/lib/catalog/queries";

export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const [profile, user] = await Promise.all([getCurrentProfile(), getCurrentUser()]);
  const cartCount = user ? await getCartCount(user.id) : 0;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteNav profile={profile} cartCount={cartCount} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
