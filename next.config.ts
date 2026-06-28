import type { NextConfig } from "next";
import { networkInterfaces } from "node:os";

const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ?? "";

// This machine's own non-internal IPv4 addresses, detected at startup. Used to
// allow-list LAN origins for the dev server (see `allowedDevOrigins` below).
// Computed dynamically so it works for any developer on any network — whoever
// runs `next dev` gets their current IP(s), and it follows DHCP changes on the
// next restart. No address is ever hardcoded.
const lanOrigins = Object.values(networkInterfaces())
  .flat()
  .filter((iface) => iface?.family === "IPv4" && !iface.internal)
  .map((iface) => iface!.address);

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Allow accessing the dev server from other devices on the LAN (phone, tablet,
  // another laptop) via this machine's IP address. Without this, Next 16 blocks
  // cross-origin requests to internal dev resources (/_next/image, Server
  // Actions), which breaks image loading and button/form handlers off localhost.
  // `lanOrigins` is auto-detected (see top of file), so no IP is hardcoded.
  allowedDevOrigins: lanOrigins,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: cloudName ? `/${cloudName}/**` : "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(login|onboarding)",
        headers: [
          { key: "Cache-Control", value: "no-store" },
        ],
      },
    ];
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  transpilePackages: ["gsap"],
};

export default nextConfig;
