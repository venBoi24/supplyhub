"use client";

import { ChevronDown, LayoutDashboard, LogOut, ShieldCheck, UserRound } from "lucide-react";
import Link from "next/link";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/features/identity/actions";
import { useI18n } from "@/i18n/client";
import { initialsFor } from "@/lib/utils/initials";
import type { Actor } from "@/server/auth/actor";

export function AccountMenuView({ actor }: { actor: Actor | null }) {
  const { t } = useI18n();
  if (!actor) {
    return (
      <Link
        href="/sign-in"
        aria-label={t("account.signIn")}
        className="inline-flex h-11 items-center gap-2 rounded-md px-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:px-3"
      >
        <UserRound className="size-5" aria-hidden="true" />
        <span className="hidden sm:inline">{t("account.signIn")}</span>
      </Link>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${t("account.menu")}: ${actor.name}`}
          className="inline-flex h-11 items-center gap-2 rounded-md px-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background focus-visible:outline-none sm:px-2.5"
        >
          <span
            aria-hidden="true"
            className="grid size-7 place-items-center rounded-[3px] border border-clay/35 bg-paper font-display text-[0.6875rem] font-semibold text-clay"
          >
            {initialsFor(actor.name)}
          </span>
          <span className="hidden max-w-28 truncate lg:inline">{actor.name}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-64">
        <DropdownMenuLabel>{t("account.signedIn")}</DropdownMenuLabel>
        <div className="px-3 pb-2">
          <p className="truncate text-sm font-medium text-foreground">{actor.name}</p>
          <p className="truncate text-xs text-muted-foreground">{actor.email}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/account" className="w-full">
            <UserRound className="size-4" aria-hidden="true" />
            {t("account.account")}
          </Link>
        </DropdownMenuItem>
        {actor.vendor || actor.role === "VENDOR" ? (
          <DropdownMenuItem asChild>
            <Link href="/vendor" className="w-full">
              <LayoutDashboard className="size-4" aria-hidden="true" />
              {t("account.studioWorkspace")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        {actor.role === "ADMIN" ? (
          <DropdownMenuItem asChild>
            <Link href="/admin/vendors" className="w-full">
              <ShieldCheck className="size-4" aria-hidden="true" />
              {t("account.vendorApplications")}
            </Link>
          </DropdownMenuItem>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void signOutAction()}>
          <LogOut className="size-4" aria-hidden="true" />
          {t("account.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
