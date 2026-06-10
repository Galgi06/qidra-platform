"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/Button";

export function SignOutButton({ callbackUrl, className = "", label }: { callbackUrl: string; className?: string; label: string }) {
  return (
    <Button
      onClick={() => {
        void signOut({ callbackUrl });
      }}
      size="sm"
      type="button"
      variant="dark"
      className={`shrink-0 ${className}`}
    >
      {label}
    </Button>
  );
}
