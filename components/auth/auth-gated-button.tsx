"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button, type ButtonProps } from "@/components/ui/button";

type AuthGatedButtonProps = Omit<ButtonProps, "onClick"> & {
  isAuthed: boolean;
  onAction: () => void;
  // Override the return path. Defaults to the current pathname.
  next?: string;
};

export function AuthGatedButton({
  isAuthed,
  onAction,
  next,
  children,
  ...buttonProps
}: AuthGatedButtonProps) {
  const router = useRouter();
  const pathname = usePathname();

  function handleClick() {
    if (isAuthed) {
      onAction();
      return;
    }
    const target = next ?? pathname ?? "/";
    router.push(`/login?next=${encodeURIComponent(target)}`);
  }

  return (
    <Button {...buttonProps} onClick={handleClick}>
      {children}
    </Button>
  );
}
