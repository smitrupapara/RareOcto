"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { completeProfile } from "@/app/(auth)/onboarding/actions";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(60),
  email: z.string().email("Enter a valid email").optional().or(z.literal("")),
});

type Values = z.infer<typeof schema>;

export function OnboardingForm() {
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<Values>({ resolver: zodResolver(schema) });

  function onSubmit(data: Values) {
    const fd = new FormData();
    fd.set("name", data.name);
    fd.set("email", data.email ?? "");
    startTransition(async () => {
      const result = await completeProfile(fd);
      if (result?.error) {
        setError("root", { message: result.error });
      }
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          One last thing
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell us your name so we know what to call you
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <input
            {...register("name")}
            type="text"
            placeholder="Your name"
            autoFocus
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          {errors.name && (
            <p className="mt-1.5 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div>
          <input
            {...register("email")}
            type="email"
            placeholder="Email (optional)"
            className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          />
          {errors.email && (
            <p className="mt-1.5 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        {errors.root && (
          <p className="text-xs text-destructive">{errors.root.message}</p>
        )}

        <Button type="submit" className="w-full" size="lg" disabled={isPending}>
          {isPending ? "Saving…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
