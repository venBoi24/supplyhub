"use client";

import { Check, ChevronDown, Languages } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils/cn";

import { useI18n } from "./client";
import { LOCALE_META } from "./config";

export function LanguageSwitcher({
  className,
  compact = false,
}: {
  className?: string;
  /** icon + code only (tight headers); otherwise icon + native name */
  compact?: boolean;
}) {
  const { locale, locales, setLocale, t } = useI18n();
  const current = LOCALE_META[locale];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={t("language.choose")}
          title={t("language.current") + ": " + current.name}
          className={cn(
            "inline-flex h-11 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none",
            className,
          )}
        >
          <Languages className="size-5" aria-hidden="true" />
          <span className="hidden text-xs font-semibold tracking-wide uppercase sm:inline">
            {compact ? current.code : current.name}
          </span>
          <span className="text-xs font-semibold uppercase sm:hidden">{current.code}</span>
          <ChevronDown className="size-3.5 opacity-60" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel>{t("language.choose")}</DropdownMenuLabel>
        {locales.map((meta) => (
          <DropdownMenuItem
            key={meta.code}
            onSelect={() => setLocale(meta.code)}
            aria-current={meta.code === locale ? "true" : undefined}
            className={cn("justify-between gap-3", meta.code === locale && "bg-surface-muted")}
          >
            <span className="flex items-center gap-2.5">
              <span aria-hidden="true" className="text-base leading-none">
                {meta.flag}
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-medium">{meta.name}</span>
                <span className="text-[0.6875rem] text-muted-foreground">{meta.english}</span>
              </span>
            </span>
            {meta.code === locale ? (
              <Check className="size-4 text-accent" aria-hidden="true" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
