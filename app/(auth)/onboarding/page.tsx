import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { OnboardingForm } from "@/components/auth/onboarding-form";

export const metadata: Metadata = { title: "Complete your profile" };

export default async function OnboardingPage() {
  const user = await requireUser();

  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.name) redirect("/");

  return <OnboardingForm />;
}
