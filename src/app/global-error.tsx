"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Unhandled global error", error.digest ?? "no-digest");
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f4f6f9",
          color: "#0b1020",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          padding: "1.5rem",
        }}
      >
        <main style={{ maxWidth: "36rem" }}>
          <h1 style={{ fontSize: "1.875rem", fontWeight: 600, margin: 0 }}>
            SupplyHub needs a moment.
          </h1>
          <p style={{ marginTop: "1rem", lineHeight: 1.6, color: "#59647a" }}>
            An unexpected error prevented the application from rendering. Try again to continue.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              border: 0,
              borderRadius: "0.5rem",
              padding: "0.75rem 1.25rem",
              background: "#1d4ed8",
              color: "#ffffff",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
