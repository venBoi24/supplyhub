"use client";

import { useState, type FormEvent } from "react";
import { KeyRound, LogIn, ShieldCheck, Smartphone, SmartphoneNfc } from "lucide-react";

import { useI18n } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

import { useExperience } from "../store";

const input =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm focus:border-[#0f766e] focus:outline-none";

export function SecurityPanel() {
  const { t } = useI18n();
  const { state, enableTwoFactor, disableTwoFactor, verifyPhone, recordLoginAlert } =
    useExperience();
  const { security } = state;
  const [phone, setPhone] = useState(security.phoneNumber);
  const [secret, setSecret] = useState<string | null>(null);

  const toggle2fa = () => {
    if (security.twoFactorEnabled) {
      disableTwoFactor();
      setSecret(null);
    } else {
      setSecret(enableTwoFactor());
    }
  };

  const submitPhone = (e: FormEvent) => {
    e.preventDefault();
    if (phone.trim().length < 6) return;
    verifyPhone(phone.trim());
  };

  const simulateSignIn = () => {
    const devices = [
      "Chrome on Windows",
      "Safari on iPhone",
      "Firefox on macOS",
      "Chrome on Android",
    ];
    const places = ["Dar es Salaam, TZ", "Arusha, TZ", "Mwanza, TZ", "Dodoma, TZ"];
    recordLoginAlert(
      devices[Math.floor(Math.random() * devices.length)]!,
      places[Math.floor(Math.random() * places.length)]!,
    );
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6">
        <section className="rounded-2xl border border-border bg-surface p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-medium">
                <KeyRound className="size-5 text-[#0f766e]" /> {t("experience.security.twoFactor")}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {t("experience.security.twoFactorBody")}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={security.twoFactorEnabled}
              aria-label="Toggle two-factor authentication"
              onClick={toggle2fa}
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition",
                security.twoFactorEnabled ? "bg-[#0f766e]" : "bg-border-strong",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 size-5 rounded-full bg-white transition-all",
                  security.twoFactorEnabled ? "left-[1.375rem]" : "left-0.5",
                )}
              />
            </button>
          </div>
          {security.twoFactorEnabled ? (
            <div className="mt-4 rounded-lg border border-[#0f766e]/30 bg-[#0f766e]/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-[#0f766e]">
                <ShieldCheck className="size-4" /> Enabled
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Add this setup key to your authenticator app:
              </p>
              <p className="mt-1 rounded bg-surface px-2 py-1 font-mono text-sm tracking-wider break-all">
                {secret ?? security.twoFactorSecret}
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              Currently off. Turn it on to protect your account and saved addresses.
            </p>
          )}
        </section>

        <form onSubmit={submitPhone} className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <Smartphone className="size-5 text-[#0f766e]" /> {t("experience.security.phone")}
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("experience.security.phoneBody")}</p>
          <div className="mt-3 flex gap-2">
            <input
              className={input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+255 7XX XXX XXX"
              aria-label="Phone number"
            />
            <button
              type="submit"
              disabled={phone.trim().length < 6}
              className="shrink-0 rounded-lg bg-[#0f766e] px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {security.phoneVerified ? "Update" : t("experience.security.verify")}
            </button>
          </div>
          {security.phoneVerified ? (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#0f766e]">
              <SmartphoneNfc className="size-4" /> {t("common.verified")} · {security.phoneNumber}
            </p>
          ) : null}
        </form>
      </div>

      <section className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-medium">
            <LogIn className="size-5 text-[#0f766e]" /> {t("experience.security.loginAlerts")}
          </h2>
          <button
            type="button"
            onClick={simulateSignIn}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:border-border-strong hover:text-foreground"
          >
            {t("experience.security.simulate")}
          </button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          We notify you whenever your account is accessed from a new device or place.
        </p>
        {security.loginAlerts.length === 0 ? (
          <p className="mt-4 rounded-lg border border-border bg-surface-muted p-3 text-sm text-muted-foreground">
            No sign-ins recorded yet on this device.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {security.loginAlerts.map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{a.device}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.location}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {new Date(a.at).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-xs text-muted-foreground">
          Didn&apos;t recognise a sign-in? Turn on two-factor authentication and change your
          password.
        </p>
      </section>
    </div>
  );
}
