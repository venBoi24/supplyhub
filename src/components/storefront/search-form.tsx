"use client";

import { Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils/cn";

export function SearchForm({
  defaultValue = "",
  inputId = "catalog-search",
  className,
}: {
  defaultValue?: string;
  inputId?: string;
  className?: string;
}) {
  const t = useT();

  return (
    <form role="search" action="/search" method="get" className={cn("relative", className)}>
      <label htmlFor={inputId} className="sr-only">
        {t("common.searchObjectsAndStudios")}
      </label>
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <Input
        id={inputId}
        name="q"
        type="search"
        defaultValue={defaultValue}
        placeholder={t("common.searchObjects")}
        autoComplete="off"
        className="h-11 bg-surface pr-24 pl-10"
      />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 px-2.5 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase hover:text-foreground"
      >
        {t("common.search")}
      </Button>
    </form>
  );
}
