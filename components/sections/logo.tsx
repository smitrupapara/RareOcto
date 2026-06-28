import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/logo-no-background.webp"
      alt="RareOcto"
      width={512}
      height={512}
      className={cn("object-contain", className)}
      priority
    />
  );
}
