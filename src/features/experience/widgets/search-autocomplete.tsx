"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CornerDownLeft, Search, Store, Tag } from "lucide-react";

import { cn } from "@/lib/utils/cn";

interface SuggestResponse {
  query: string;
  corrected: string | null;
  products: {
    slug: string;
    name: string;
    vendorName: string;
    priceCents: number;
    currency: string;
    image: string;
  }[];
  studios: { slug: string; name: string; location: string }[];
  departments: { slug: string; name: string }[];
}

const EMPTY: SuggestResponse = {
  query: "",
  corrected: null,
  products: [],
  studios: [],
  departments: [],
};

export function SearchAutocomplete({
  defaultValue = "",
  inputId,
  className,
  autoFocus = false,
}: {
  defaultValue?: string;
  inputId?: string;
  className?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const generatedId = useId();
  const id = inputId ?? generatedId;
  const [value, setValue] = useState(defaultValue);
  const [data, setData] = useState<SuggestResponse>(EMPTY);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced, abortable fetch of real catalog suggestions with typo tolerance.
  // All state updates happen inside the timeout callback (an external-system
  // sync), never synchronously in the effect body.
  useEffect(() => {
    const q = value.trim();
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = window.setTimeout(async () => {
      if (q.length < 2) {
        setData(EMPTY);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/search-suggest?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("suggest failed");
        const json = (await res.json()) as SuggestResponse;
        setData(json);
        setActive(-1);
      } catch {
        if (!controller.signal.aborted) setData(EMPTY);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  // Close on outside click.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const flat = [
    ...data.products.map((p) => ({
      kind: "product" as const,
      href: `/products/${p.slug}`,
      label: p.name,
    })),
    ...data.studios.map((s) => ({
      kind: "studio" as const,
      href: `/vendors/${s.slug}`,
      label: s.name,
    })),
    ...data.departments.map((d) => ({
      kind: "department" as const,
      href: `/categories/${d.slug}`,
      label: d.name,
    })),
  ];
  const hasResults = flat.length > 0;
  const showPanel = open && value.trim().length >= 2;

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (active >= 0 && flat[active]) {
      go(flat[active]!.href);
      return;
    }
    go(`/search?q=${encodeURIComponent(data.corrected ?? q)}`);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!showPanel) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const productOffset = 0;
  const studioOffset = data.products.length;
  const departmentOffset = data.products.length + data.studios.length;

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form role="search" action="/search" method="get" onSubmit={submit} className="relative">
        <label htmlFor={id} className="sr-only">
          Search objects and studios
        </label>
        <Search
          className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          id={id}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={`${id}-listbox`}
          aria-autocomplete="list"
          autoComplete="off"
          autoFocus={autoFocus}
          value={value}
          placeholder="Search objects, studios, materials"
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-11 w-full rounded-md border border-border bg-surface pr-24 pl-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-border-strong focus:ring-2 focus:ring-ring focus:outline-none"
        />
        <button
          type="submit"
          className="absolute top-1/2 right-1.5 h-8 -translate-y-1/2 rounded px-2.5 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase transition hover:text-foreground"
        >
          {loading ? "…" : "Search"}
        </button>
      </form>

      {showPanel ? (
        <div
          id={`${id}-listbox`}
          role="listbox"
          className="absolute inset-x-0 top-[calc(100%+0.5rem)] z-50 max-h-[22rem] scrollbar-thin overflow-y-auto rounded-xl border border-border bg-surface p-1.5 shadow-[0_18px_50px_-24px_rgb(11_16_32/0.45)]"
        >
          {data.corrected ? (
            <button
              type="button"
              onClick={() => {
                setValue(data.corrected!);
                setOpen(true);
              }}
              className="mb-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs text-muted-foreground transition hover:bg-surface-muted"
            >
              Did you mean <span className="font-semibold text-[#0f766e]">{data.corrected}</span>?
            </button>
          ) : null}

          {!hasResults && !loading ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">
              No matches. Press Enter to search the full catalog for “{value.trim()}”.
            </p>
          ) : null}

          {data.products.length > 0 ? (
            <p className="px-3 pt-2 pb-1 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
              Objects
            </p>
          ) : null}
          {data.products.map((p, i) => {
            const index = productOffset + i;
            return (
              <button
                key={p.slug}
                type="button"
                role="option"
                aria-selected={active === index}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(`/products/${p.slug}`)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition",
                  active === index ? "bg-surface-muted" : "hover:bg-surface-muted",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image} alt="" className="size-9 shrink-0 rounded-md object-cover" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {p.vendorName}
                  </span>
                </span>
                <span className="shrink-0 text-xs font-semibold text-[#0f766e]">
                  {p.currency} {Math.round(p.priceCents / 100).toLocaleString("en-US")}
                </span>
              </button>
            );
          })}

          {data.studios.length > 0 ? (
            <p className="px-3 pt-2 pb-1 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
              Studios
            </p>
          ) : null}
          {data.studios.map((s, i) => {
            const index = studioOffset + i;
            return (
              <button
                key={s.slug}
                type="button"
                role="option"
                aria-selected={active === index}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(`/vendors/${s.slug}`)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition",
                  active === index ? "bg-surface-muted" : "hover:bg-surface-muted",
                )}
              >
                <Store className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{s.location}</span>
                </span>
              </button>
            );
          })}

          {data.departments.length > 0 ? (
            <p className="px-3 pt-2 pb-1 font-mono text-[0.625rem] tracking-[0.12em] text-muted-foreground uppercase">
              Departments
            </p>
          ) : null}
          {data.departments.map((d, i) => {
            const index = departmentOffset + i;
            return (
              <button
                key={d.slug}
                type="button"
                role="option"
                aria-selected={active === index}
                onMouseEnter={() => setActive(index)}
                onClick={() => go(`/categories/${d.slug}`)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition",
                  active === index ? "bg-surface-muted" : "hover:bg-surface-muted",
                )}
              >
                <Tag className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="truncate text-sm font-medium">{d.name}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => go(`/search?q=${encodeURIComponent(data.corrected ?? value.trim())}`)}
            className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-border px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground transition hover:bg-surface-muted hover:text-foreground"
          >
            <CornerDownLeft className="size-3.5" aria-hidden="true" />
            See all results for “{data.corrected ?? value.trim()}”
          </button>
        </div>
      ) : null}
    </div>
  );
}
