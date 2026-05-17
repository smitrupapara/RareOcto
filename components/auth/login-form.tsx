"use client";

import { useState, useTransition, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestOtp, verifyOtp } from "@/app/(auth)/login/actions";

const phoneSchema = z.object({
  digits: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
});

const otpSchema = z.object({
  token: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from WhatsApp"),
});

type PhoneValues = z.infer<typeof phoneSchema>;
type OtpValues = z.infer<typeof otpSchema>;

export function LoginForm() {
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [serverError, setServerError] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [isPending, startTransition] = useTransition();
  const next = useSearchParams().get("next") ?? "";

  const phoneForm = useForm<PhoneValues>({ resolver: zodResolver(phoneSchema) });
  const otpForm = useForm<OtpValues>({ resolver: zodResolver(otpSchema) });

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  function handlePhoneSubmit(data: PhoneValues) {
    setServerError("");
    const fullPhone = "+91" + data.digits;
    const fd = new FormData();
    fd.set("phone", fullPhone);
    startTransition(async () => {
      const result = await requestOtp(fd);
      if (result?.error) {
        setServerError(result.error);
      } else {
        setPhone(fullPhone);
        setStep("otp");
        setCountdown(30);
      }
    });
  }

  function handleOtpSubmit(data: OtpValues) {
    setServerError("");
    const fd = new FormData();
    fd.set("phone", phone);
    fd.set("token", data.token);
    if (next) fd.set("next", next);
    startTransition(async () => {
      const result = await verifyOtp(fd);
      if (result?.error) setServerError(result.error);
    });
  }

  function handleResend() {
    if (countdown > 0 || isPending) return;
    setServerError("");
    const fd = new FormData();
    fd.set("phone", phone);
    startTransition(async () => {
      const result = await requestOtp(fd);
      if (result?.error) {
        setServerError(result.error);
      } else {
        setCountdown(30);
        otpForm.reset();
      }
    });
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
          {step === "phone" ? "Welcome back" : "Check WhatsApp"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "phone"
            ? "Enter your mobile number to continue"
            : `We sent a 6-digit code to ${phone}`}
        </p>
      </div>

      {step === "phone" ? (
        <form onSubmit={phoneForm.handleSubmit(handlePhoneSubmit)} className="space-y-4">
          <div>
            <div className="flex overflow-hidden rounded-lg border border-border focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background">
              <span className="flex items-center bg-muted px-3 text-sm text-muted-foreground select-none">
                +91
              </span>
              <input
                {...phoneForm.register("digits")}
                type="tel"
                inputMode="numeric"
                maxLength={10}
                placeholder="98765 43210"
                className="flex-1 bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none"
              />
            </div>
            {phoneForm.formState.errors.digits && (
              <p className="mt-1.5 text-xs text-destructive">
                {phoneForm.formState.errors.digits.message}
              </p>
            )}
          </div>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? "Sending…" : "Get OTP on WhatsApp"}
          </Button>
        </form>
      ) : (
        <form onSubmit={otpForm.handleSubmit(handleOtpSubmit)} className="space-y-4">
          <div>
            <input
              {...otpForm.register("token")}
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="123456"
              autoFocus
              className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-center font-mono text-2xl tracking-[0.5em] text-foreground placeholder:tracking-normal placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            {otpForm.formState.errors.token && (
              <p className="mt-1.5 text-xs text-destructive">
                {otpForm.formState.errors.token.message}
              </p>
            )}
          </div>

          {serverError && <p className="text-xs text-destructive">{serverError}</p>}

          <Button type="submit" className="w-full" size="lg" disabled={isPending}>
            {isPending ? "Verifying…" : "Verify"}
          </Button>

          <div className="flex items-center justify-between text-sm">
            <button
              type="button"
              onClick={() => { setStep("phone"); setServerError(""); otpForm.reset(); }}
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Change number
            </button>
            <button
              type="button"
              onClick={handleResend}
              disabled={countdown > 0 || isPending}
              className="text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
            >
              {countdown > 0 ? `Resend in ${countdown}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
