import Link from "next/link";
import { Logo } from "./logo";

export function SiteFooter() {
  return (
    <footer className="relative mt-32 border-t border-border/60 bg-background">
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-coral/60 to-transparent" />

      <div className="mx-auto max-w-7xl px-4 pb-12 pt-16 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.6fr_2fr_1.4fr]">

          {/* Brand block */}
          <div>
            <Link href="/" className="inline-flex items-center gap-3" aria-label="RareOcto home">
              <Logo className="h-12 w-12" />
              <span className="font-display text-3xl font-bold tracking-tight">RareOcto</span>
            </Link>
            <p className="mt-5 max-w-xs text-pretty text-sm text-muted-foreground">
              Magnetic wallpapers that swap in seconds. Bold designs for bold walls — no nails, no glue, no regrets.
            </p>
            <p className="mt-5 font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Made in India · Shipped worldwide
            </p>
          </div>

          {/* Company details */}
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
              Company
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="font-medium text-foreground">RareOcto Innovations Pvt. Ltd.</li>
              <li>B-911 Titanium City Center Corporate Offices, 100 Feet Anand Nagar Road</li>
              <li> Prahladnagar, Ahmedabad-380015</li>
              <li>Gujarat, India</li>
              <li className="pt-2">
                <a href="mailto:hello@rareocto.com" className="hover:text-coral transition-colors">
                  hello@rareocto.com
                </a>
              </li>
              <li>
                <a href="tel:+919824083085" className="hover:text-coral transition-colors">
                  +91 98240 83085
                </a>
              </li>
            </ul>
          </div>

          {/* Links */}
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-1">
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Pages
              </p>
              <ul className="mt-4 space-y-3 text-sm">
                <li>
                  <Link href="/" className="text-foreground/80 transition-colors hover:text-coral">
                    Home
                  </Link>
                </li>
                <li>
                  <Link href="/catalog" className="text-foreground/80 transition-colors hover:text-coral">
                    Catalog
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-xs uppercase tracking-[0.3em] text-muted-foreground">
                Coming Soon
              </p>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground/50 select-none">
                <li>Try-On</li>
                <li>About</li>
                <li>Blog</li>
              </ul>
            </div>
          </div>

        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} RareOcto Innovations Pvt. Ltd. All rights reserved.</p>
          <p className="font-mono tracking-wide">GST Reg. · Made in India</p>
        </div>
      </div>
    </footer>
  );
}
