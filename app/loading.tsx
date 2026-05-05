export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center">
      <div className="flex items-center gap-3 font-display text-3xl font-bold tracking-tight">
        <span className="inline-block size-3 animate-pulse rounded-full bg-primary" />
        <span className="bg-gradient-to-r from-foreground via-coral to-foreground bg-[length:200%_100%] bg-clip-text text-transparent [animation:marquee_2s_linear_infinite]">
          loading…
        </span>
      </div>
    </div>
  );
}
