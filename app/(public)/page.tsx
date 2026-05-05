import type { Metadata } from "next";
import { HeroSection } from "@/components/sections/hero-section";
import { HowItWorks } from "@/components/sections/how-it-works";
import { OurVision } from "@/components/sections/our-vision";
import { AboutUs } from "@/components/sections/about-us";

export const metadata: Metadata = {
  title: "RareOcto — Stick. Peel. Repeat.",
  description:
    "Magnetic wallpaper art for your wall. No nails, no glue, no regrets. Re-style your space like you swap playlists.",
};

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <HowItWorks />
      <OurVision />
      <AboutUs />
    </>
  );
}
