"use client";

import { useEffect } from "react";
import { getSession, signOut } from "next-auth/react";

const inactivityLimitMs = 10 * 60 * 1000;
const lastActivityKey = "qidra:last-activity";

export function AutoSignOut() {
  useEffect(() => {
    let timeoutId: number | undefined;

    function callbackUrl() {
      const params = new URLSearchParams(window.location.search);
      return params.get("lang") === "en" ? "/?lang=en" : "/?lang=ru";
    }

    function rememberActivity() {
      window.localStorage.setItem(lastActivityKey, Date.now().toString());
    }

    async function signOutIfSessionExpired() {
      const lastActivity = Number(window.localStorage.getItem(lastActivityKey) ?? Date.now().toString());
      const inactiveFor = Date.now() - lastActivity;

      if (inactiveFor < inactivityLimitMs) {
        schedule(inactivityLimitMs - inactiveFor);
        return;
      }

      const session = await getSession();

      if (session?.user) {
        await signOut({ callbackUrl: callbackUrl() });
        return;
      }

      rememberActivity();
      schedule(inactivityLimitMs);
    }

    function schedule(delay = inactivityLimitMs) {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      timeoutId = window.setTimeout(() => {
        void signOutIfSessionExpired();
      }, delay);
    }

    function handleActivity() {
      rememberActivity();
      schedule();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void signOutIfSessionExpired();
      }
    }

    const activityEvents = ["click", "keydown", "mousemove", "scroll", "touchstart"] as const;

    rememberActivity();
    schedule();
    activityEvents.forEach((eventName) => window.addEventListener(eventName, handleActivity, { passive: true }));
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      activityEvents.forEach((eventName) => window.removeEventListener(eventName, handleActivity));
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, []);

  return null;
}
