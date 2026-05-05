"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Logo } from "./logo";
import type { NavLink } from "@/types";

const NAV_LINKS: NavLink[] = [
  { href: "/catalog", label: "Catalog" },
];

export function SiteNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

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
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
