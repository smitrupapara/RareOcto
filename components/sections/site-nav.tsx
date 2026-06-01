"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { ChevronDown, Heart, Menu, Moon, ShoppingBag, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "./logo";
import { signOut } from "@/lib/auth-actions";
import type { NavLink } from "@/types";
import type { Profile } from "@/types/database";

const NAV_LINKS: NavLink[] = [
  { href: "/catalog", label: "Catalog" },
];

export function SiteNav({
  profile,
  cartCount = 0,
}: {
  profile?: Profile | null;
  cartCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [isPending, startTransition] = useTransition();

  function scrollToAbout() {
    if (pathname === "/") {
      const lenis = (window as { __lenis?: { scrollTo: (target: string) => void } }).__lenis;
      if (lenis) {
        lenis.scrollTo("#about-us");
      } else {
        document.getElementById("about-us")?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      router.push("/#about-us");
    }
  }

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full border-b border-transparent transition-[background,backdrop-filter,border-color] duration-300",
        scrolled &&
          "border-border/60 bg-background/70 backdrop-blur-xl supports-[backdrop-filter]:bg-background/55",
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:h-20 lg:px-8">
        <Link
          href="/"
          aria-label="RareOcto home"
          className="flex items-center gap-2"
        >
          <Logo className="h-9 w-9 lg:h-10 lg:w-10" />
          <span className="font-display text-xl font-bold leading-none tracking-tight lg:text-2xl">
            RareOcto
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-medium tracking-wide text-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
          <button
            onClick={scrollToAbout}
            className="rounded-full px-4 py-2 text-sm font-medium tracking-wide text-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            About
          </button>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {profile ? (
            <Button
              asChild
              variant="ghost"
              size="icon"
              aria-label="Saved pieces"
              className="rounded-full"
            >
              <Link href="/account/favorites">
                <Heart className="size-5" />
              </Link>
            </Button>
          ) : null}

          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={cartCount > 0 ? `Cart (${cartCount} items)` : "Cart"}
            className="relative rounded-full"
          >
            <Link href="/cart">
              <ShoppingBag className="size-5" />
              {cartCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--coral)] px-1 text-[10px] font-semibold leading-none text-white">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </Link>
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className="rounded-full"
            onClick={() => {
              const isDarkNow =
                document.documentElement.classList.contains("dark");
              const next = !isDarkNow;

              document.documentElement.classList.toggle("dark", next);
              try {
                localStorage.setItem("theme", next ? "dark" : "light");
              } catch {}
              setIsDark(next);
            }}
          >
            {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </Button>

          {profile ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="hidden md:flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-accent/40 hover:text-foreground">
                {profile.name}
                <ChevronDown className="size-3.5 opacity-60" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[180px]">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>{profile.phone}</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/account/favorites")}>
                  Favorites
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  disabled={isPending}
                  onClick={() => startTransition(() => signOut())}
                >
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="ghost" size="sm" className="hidden md:flex rounded-full">
              <Link href="/login">Login</Link>
            </Button>
          )}

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open menu"
                className="rounded-full md:hidden"
              >
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-full sm:max-w-sm">
              <SheetHeader className="border-b">
                <SheetTitle className="flex items-center gap-2 font-display text-2xl">
                  <Logo className="h-8 w-8" /> RareOcto
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4 py-6 text-2xl font-display font-bold">
                {NAV_LINKS.map((l) => (
                  <SheetClose asChild key={l.href}>
                    <Link
                      href={l.href}
                      className="rounded-xl px-3 py-3 transition-colors hover:bg-accent/40"
                    >
                      {l.label}
                    </Link>
                  </SheetClose>
                ))}
                <SheetClose asChild>
                  <button
                    onClick={scrollToAbout}
                    className="rounded-xl px-3 py-3 text-left transition-colors hover:bg-accent/40"
                  >
                    About
                  </button>
                </SheetClose>
                {profile ? (
                  <SheetClose asChild>
                    <Link
                      href="/account/favorites"
                      className="rounded-xl px-3 py-3 transition-colors hover:bg-accent/40"
                    >
                      Favorites
                    </Link>
                  </SheetClose>
                ) : null}
                <div className="mt-4 border-t pt-4">
                  {profile ? (
                    <button
                      onClick={() => startTransition(() => signOut())}
                      disabled={isPending}
                      className="w-full rounded-xl px-3 py-3 text-left text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                    >
                      Sign out
                    </button>
                  ) : (
                    <SheetClose asChild>
                      <Link
                        href="/login"
                        className="block rounded-xl px-3 py-3 transition-colors hover:bg-accent/40"
                      >
                        Login
                      </Link>
                    </SheetClose>
                  )}
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
