import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://rareocto.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RareOcto — Magnetic Wallpapers · Stick. Peel. Repeat.",
    template: "%s · RareOcto",
  },
  description:
    "Premium peel-and-stick magnetic wallpapers. Swap art on your wall in seconds — no glue, no damage. Designed in India, shipped worldwide.",
  keywords: [
    "magnetic wallpaper",
    "peel and stick wallpaper",
    "removable wallpaper",
    "wall art",
    "RareOcto",
  ],
  applicationName: "RareOcto",
  authors: [{ name: "RareOcto" }],
  openGraph: {
    type: "website",
    siteName: "RareOcto",
    title: "RareOcto — Stick. Peel. Repeat.",
    description:
      "Magnetic wallpapers that swap in seconds. Bold designs for bold walls.",
    url: siteUrl,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "RareOcto" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "RareOcto — Stick. Peel. Repeat.",
    description: "Magnetic wallpapers that swap in seconds.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f3e6" },
    { media: "(prefers-color-scheme: dark)", color: "#181126" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${bricolage.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full bg-background text-foreground antialiased" suppressHydrationWarning>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
