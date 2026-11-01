"use client";

import { useEffect, useState } from "react";

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaRegistration() {
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/service-worker.js", { scope: "/" }).catch(() => {
        // The site remains usable when service workers are unavailable or blocked.
      });
    }

    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (window.localStorage.getItem("supplyhub-install-dismissed") !== "1") {
        setInstallEvent(event as InstallPromptEvent);
      }
    };
    const handleInstalled = () => {
      setInstallEvent(null);
    };

    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  if (!installEvent) return null;

  return (
    <aside className="fixed right-4 bottom-4 z-50 flex max-w-sm items-center gap-3 rounded-xl border border-border bg-surface p-4 shadow-xl">
      <p className="text-sm">Install SupplyHub for a quicker return to the marketplace.</p>
      <button
        className="shrink-0 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
        onClick={() => void installEvent.prompt().then(() => setInstallEvent(null))}
        type="button"
      >
        Install
      </button>
      <button
        aria-label="Dismiss install suggestion"
        className="shrink-0 rounded-md px-2 py-2 text-sm text-muted-foreground"
        onClick={() => {
          window.localStorage.setItem("supplyhub-install-dismissed", "1");
          setInstallEvent(null);
        }}
        type="button"
      >
        Dismiss
      </button>
    </aside>
  );
}
