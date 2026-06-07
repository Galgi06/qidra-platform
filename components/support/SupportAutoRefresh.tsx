"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SupportAutoRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 7000);

    return () => window.clearInterval(intervalId);
  }, [router]);

  return null;
}
