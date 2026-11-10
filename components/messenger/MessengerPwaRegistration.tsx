"use client";

import { useEffect } from "react";

export function MessengerPwaRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker.register("/messenger-sw.js", { scope: "/messenger" });
  }, []);

  return null;
}
